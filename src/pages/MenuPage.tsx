/**
 * @file src/pages/MenuPage.tsx
 * @description Browse food for the selected day, in three tabs:
 *
 *   Bistro / Higgins: the meal being browsed (with its hours and a picker for
 *   the day's other meals), a Food group | Station switch, and that meal's
 *   dishes in collapsible sections.
 *   Worcester: restaurants near campus on a map, with a list that drags up.
 *
 * The header holds the day, Search (every dish) and Filters (Fits budget,
 * High protein, diets). Tapping a dish opens the NutritionModal to log it.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDateStore, useFoodLogStore, useMenuStore, useUIStore, useUserStore, toLocalDateString } from "@/stores";
import { filterByDietary, profileDietFilters } from "@/utils/dietary";
import { findActiveMealPeriod, findNextMealPeriod } from "@/utils/time";
import { HIGH_PROTEIN_G, num, stationLabel } from "@/utils/menuHelpers";
import { FOOD_GROUPS, FOOD_GROUP_BY_ID, foodGroupOf, type FoodGroup } from "@/utils/foodGroups";
import { restaurantToLocation } from "@/utils/restaurants";
import { WORCESTER_RESTAURANTS } from "@/data/worcesterRestaurants";
import type { DiningLocation, MealPeriod, MenuItem } from "@/types";

import MenuTabs from "@/components/menu/MenuTabs";
import MealBar from "@/components/menu/MealBar";
import GroupBySwitch from "@/components/menu/GroupBySwitch";
import DishSections, { type DishSection } from "@/components/menu/DishSections";
import FiltersSheet from "@/components/menu/FiltersSheet";
import MenuSearchSheet from "@/components/menu/MenuSearchSheet";
import DatePicker from "@/components/menu/DatePicker";
import NutritionModal from "@/components/menu/NutritionModal";
import Sheet from "@/components/ui/Sheet";
import { LocationCardErrorBoundary } from "@/components/menu/LocationCardErrorBoundary";
import { AlertIcon, UtensilsIcon } from "@/components/icons";

// Leaflet and the restaurant data only load once the Worcester tab is opened
const WorcesterView = lazy(() => import("@/components/restaurants/WorcesterView"));

const WORCESTER = "worcester";

/** The meal being served now, else the next one, else the day's last (late at night). */
function defaultMeal(location: DiningLocation | undefined): string {
  const meals = location?.meals ?? [];
  return (findActiveMealPeriod(meals) ?? findNextMealPeriod(meals) ?? meals[meals.length - 1])?.name ?? "";
}

/** Tab name: "The Table at Higgins" → "Higgins", "The Bistro" → "Bistro". */
const tabName = (name: string) => name.replace(/^the table at /i, "").replace(/^the /i, "");

export default function MenuPage() {
  const { selectedDate } = useDateStore();
  const { menuData, isLoading, error, fetchMenu } = useMenuStore();
  const ui = useUIStore();
  const { menuArea, activeDietaryFilters, highProtein, fitsBudget, menuGroupBy, menuSheet, setMenuSheet } = ui;
  const profileDiets = useUserStore((s) => s.userProfile?.dietaryRestrictions);
  const targets = useUserStore((s) => s.macroTargets);
  const eaten = useFoodLogStore((s) => s.getDailyTotals(selectedDate).calories);
  const remaining = targets.calories - eaten;

  // Start filtered to the diets saved on the profile (vegan, gluten-free…).
  // Only when those change, so filters changed by hand stay as they are.
  useEffect(() => { ui.applyProfileDiets(profileDietFilters(profileDiets)); }, [profileDiets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch the menu whenever the day changes, and go back to that day's current meal
  useEffect(() => { fetchMenu(selectedDate); }, [selectedDate, fetchMenu]);
  useEffect(() => { useUIStore.getState().setActiveMealPeriod(null); }, [selectedDate]);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedLocation, setSelectedLoc] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("");
  const dateSheet = useRef<{ close: () => void } | null>(null);

  function handleSelectItem(item: MenuItem, locationName: string, mealName?: string) {
    setSelectedItem(item);
    setSelectedLoc(locationName);
    setSelectedMeal(mealName ?? "");
  }

  // ── Tabs: the Bistro first, then Higgins, then any other hall, then Worcester ──
  const locations = useMemo(() => {
    const ls = [...(menuData?.locations ?? [])];
    const rank = (l: DiningLocation) => (/bistro/i.test(l.name) ? 0 : /higgins/i.test(l.name) ? 1 : 2);
    return ls.sort((a, b) => rank(a) - rank(b));
  }, [menuData]);
  const location = locations.find((l) => l.slug === ui.activeLocationSlug)
    ?? locations.find((l) => /higgins/i.test(l.name)) ?? locations[0];
  const tab = menuArea === "worcester" ? WORCESTER : location?.slug ?? "";
  const tabs = [...locations.map((l) => ({ id: l.slug, label: tabName(l.name) })), { id: WORCESTER, label: "Worcester" }];

  function selectTab(id: string) {
    if (id === WORCESTER) return ui.setMenuArea("worcester");
    ui.setMenuArea("clark");
    if (id !== location?.slug) {
      ui.setActiveLocation(id);
      ui.setActiveMealPeriod(null);
    }
  }

  const mealName = location?.meals.some((m) => m.name === ui.activeMealPeriod) ? ui.activeMealPeriod! : defaultMeal(location);
  const meal = location?.meals.find((m) => m.name === mealName);
  const isToday = selectedDate === toLocalDateString();

  const filtersOn = activeDietaryFilters.length > 0 || highProtein || fitsBudget;
  const sections = useMemo(
    () => (meal ? buildSections(meal, menuGroupBy, { diets: activeDietaryFilters, highProtein, maxCalories: fitsBudget ? Math.max(0, remaining) : null }) : []),
    [meal, menuGroupBy, activeDietaryFilters, highProtein, fitsBudget, remaining],
  );

  function clearFilters() {
    ui.clearDietaryFilters();
    ui.setHighProtein(false);
    ui.setFitsBudget(false);
  }

  // Worcester's search covers the restaurants; the halls' covers both halls
  const searchLocations = useMemo(
    () => (menuArea === "worcester" ? WORCESTER_RESTAURANTS.map((r) => restaurantToLocation(r, selectedDate)) : locations),
    [menuArea, locations, selectedDate],
  );

  return (
    <div className="page" style={menuArea === "worcester" ? { paddingBottom: 0 } : undefined}>
      <div data-tour="menu-controls" style={{ marginBottom: menuArea === "worcester" ? 0 : "1rem" }}>
        {isLoading && !menuData ? (
          <div className="skeleton" style={{ height: 46, borderRadius: "var(--radius-md)" }} />
        ) : (
          <MenuTabs tabs={tabs} value={tab} onChange={selectTab} />
        )}
      </div>

      {menuArea === "worcester" ? (
        <Suspense fallback={<div className="skeleton" style={{ height: 420, borderRadius: "var(--radius-lg)" }} />}>
          <WorcesterView onSelectItem={handleSelectItem} />
        </Suspense>
      ) : (
        <>
          {isLoading && <MenuSkeleton />}

          {error && !isLoading && (
            <div style={{
              padding: "1.25rem", borderRadius: "var(--radius-lg)",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center",
            }}>
              <AlertIcon size={26} style={{ color: "#f87171", display: "block", margin: "0 auto 0.5rem" }} />
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#f87171", fontWeight: 600 }}>Couldn't load the menu</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "var(--color-text-3)" }}>Check your connection, then try again.</p>
              <button className="btn-ghost" onClick={() => fetchMenu(selectedDate)} style={{ marginTop: "0.75rem" }}>Retry</button>
            </div>
          )}

          {!isLoading && !error && menuData && locations.length === 0 && (
            <Empty title="No dining service this day" body="Clark dining may be closed for a break or holiday." />
          )}

          {!isLoading && !error && location && !meal && (
            <Empty title={`${tabName(location.name)} isn't serving this day`} body="Try another tab, or another day." />
          )}

          {!isLoading && !error && location && meal && (
            <LocationCardErrorBoundary key={`${location.slug}|${meal.name}`} locationName={location.name}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
                <MealBar location={location} meal={meal} isToday={isToday} onMeal={(m) => ui.setActiveMealPeriod(m)} />
                <GroupBySwitch />
              </div>

              {sections.length > 0 ? (
                <DishSections key={`${location.slug}|${meal.name}|${menuGroupBy}`} sections={sections} onSelect={(i) => handleSelectItem(i, location.name, meal.name)} />
              ) : (
                <Empty
                  title={filtersOn ? "No dishes match your filters" : "Nothing listed for this meal"}
                  body={filtersOn ? (fitsBudget && remaining <= 0 ? "You've used today's calories, so Fits budget hides everything." : "Try fewer filters, or another meal.") : "Try another meal or another day."}
                  action={filtersOn ? { label: "Clear filters", run: clearFilters } : undefined}
                />
              )}
            </LocationCardErrorBoundary>
          )}
        </>
      )}

      {menuSheet === "search" && (
        <MenuSearchSheet
          locations={searchLocations}
          slug={menuArea === "worcester" ? "" : location?.slug ?? ""}
          meal={mealName}
          scope={menuArea === "worcester" ? "the restaurants near campus" : "Higgins and The Bistro"}
          onSelect={handleSelectItem}
          onClose={() => { setMenuSheet(null); ui.setSearchQuery(""); }}
        />
      )}

      {menuSheet === "filters" && (
        <FiltersSheet remaining={remaining} dietsOnly={menuArea === "worcester"} onClose={() => setMenuSheet(null)} />
      )}

      {menuSheet === "date" && (
        <Sheet title="Pick a day" onClose={() => setMenuSheet(null)} controlRef={dateSheet}>
          <div style={{ paddingBottom: "0.75rem" }}>
            <DatePicker onPick={() => dateSheet.current?.close()} />
          </div>
        </Sheet>
      )}

      <NutritionModal
        item={selectedItem}
        locationName={selectedLocation}
        sourceMealName={selectedMeal}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

interface Filter {
  diets: string[];
  highProtein: boolean;
  /** Only dishes within this many calories; null for no limit. */
  maxCalories: number | null;
}

/** The meal's dishes that pass the filters, by station or by food group. */
function buildSections(meal: MealPeriod, groupBy: "station" | "food", f: Filter): DishSection[] {
  const pass = (items: MenuItem[]) =>
    filterByDietary(items ?? [], f.diets).filter((i) =>
      (!f.highProtein || num(i.protein) >= HIGH_PROTEIN_G) &&
      (f.maxCalories === null || num(i.calories) <= f.maxCalories));

  if (groupBy === "station") {
    return (meal.stations ?? [])
      .map((s) => ({
        key: `${s.id}-${s.name}`,
        title: stationLabel(s.name ?? ""),
        dishes: pass(s.items).map((item) => {
          const g = FOOD_GROUP_BY_ID[foodGroupOf(item, s.name)];
          return { item, tag: { label: g.label, color: g.color } };
        }),
      }))
      .filter((s) => s.dishes.length > 0);
  }

  // By food group: each dish once, even where two stations serve it
  const byGroup = new Map<FoodGroup, DishSection["dishes"]>();
  const seen = new Set<string>();
  for (const s of meal.stations ?? []) {
    for (const item of pass(s.items)) {
      const k = (item.name ?? "").toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const g = foodGroupOf(item, s.name);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push({ item, tag: { label: stationLabel(s.name ?? "") } });
    }
  }
  return FOOD_GROUPS.filter((g) => byGroup.has(g.id)).map((g) => ({ key: g.id, title: g.label, dishes: byGroup.get(g.id)! }));
}

function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; run: () => void } }) {
  return (
    <div style={{ textAlign: "center", padding: "1.75rem 1rem 0.75rem" }}>
      <UtensilsIcon size={32} style={{ color: "var(--color-text-3)", display: "block", margin: "0 auto 0.6rem" }} />
      <p style={{ margin: 0, fontWeight: 650, color: "var(--color-text-1)" }}>{title}</p>
      <p style={{ margin: "0.35rem auto 0", maxWidth: 300, fontSize: "0.8rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>{body}</p>
      {action && <button className="btn-ghost" onClick={action.run} style={{ marginTop: "0.85rem" }}>{action.label}</button>}
    </div>
  );
}

/** Shaped like the meal bar, switch and sections while the menu loads. */
function MenuSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading menu" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="skeleton" style={{ width: "55%", height: 16 }} />
        <div className="skeleton" style={{ width: 100, height: 40, borderRadius: "var(--radius-full)" }} />
      </div>
      <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius-full)" }} />
      {[220, 64, 64, 64].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: "var(--radius-xl)", opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}
