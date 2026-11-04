/**
 * @file src/pages/MenuPage.tsx
 * @description Browse food for the selected day.
 *
 * Clark: what's left of the day's budget, a Higgins | Bistro switch showing
 * the meal being browsed, filter chips, and that meal's main dishes, biggest
 * first. Everything else (toppings, sides, desserts) is in the search sheet
 * the header's Search opens. Worcester: nearby restaurants (map + list).
 *
 * Tapping a dish on either side opens the NutritionModal to log it.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDateStore, useFoodLogStore, useMenuStore, useUIStore, useUserStore, toLocalDateString } from "@/stores";
import { profileDietFilters } from "@/utils/dietary";
import { findActiveMealPeriod, findNextMealPeriod } from "@/utils/time";
import { mealSlotFor, pickMains } from "@/utils/mains";
import type { DiningLocation, MenuItem } from "@/types";

import BudgetCard from "@/components/menu/BudgetCard";
import LocationSwitch, { shortName } from "@/components/menu/LocationSwitch";
import MenuFilters, { DIET_CHIPS } from "@/components/menu/MenuFilters";
import DishRow from "@/components/menu/DishRow";
import MenuSearch from "@/components/menu/MenuSearch";
import MenuSearchSheet from "@/components/menu/MenuSearchSheet";
import DatePicker from "@/components/menu/DatePicker";
import NutritionModal from "@/components/menu/NutritionModal";
import Sheet from "@/components/ui/Sheet";
import { LocationCardErrorBoundary } from "@/components/menu/LocationCardErrorBoundary";
import { AlertIcon, SearchIcon, UtensilsIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";

// Leaflet and the restaurant data only load once the Worcester side is opened
const WorcesterView = lazy(() => import("@/components/restaurants/WorcesterView"));

const SHORT_DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

/** The meal being served now, else the next one, else the day's last (late at night). */
function defaultMeal(location: DiningLocation | undefined): string {
  const meals = location?.meals ?? [];
  return (findActiveMealPeriod(meals) ?? findNextMealPeriod(meals) ?? meals[meals.length - 1])?.name ?? "";
}

export default function MenuPage() {
  const { selectedDate } = useDateStore();
  const { menuData, isLoading, error, fetchMenu } = useMenuStore();
  const ui = useUIStore();
  const { menuArea, applyProfileDiets, activeDietaryFilters, highProtein, fitsBudget, setFitsBudget, menuSheet, setMenuSheet } = ui;
  const profileDiets = useUserStore((s) => s.userProfile?.dietaryRestrictions);
  const targets = useUserStore((s) => s.macroTargets);
  const { getDailyTotals, getDailyEntries } = useFoodLogStore();
  const totals  = getDailyTotals(selectedDate);
  const entries = getDailyEntries(selectedDate);

  // Start filtered to the diets saved on the profile (vegan, gluten-free…).
  // Only when those change, so chips changed by hand stay as they are.
  useEffect(() => { applyProfileDiets(profileDietFilters(profileDiets)); }, [profileDiets, applyProfileDiets]);

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

  // ── What's being browsed ──
  const locations = menuData?.locations ?? [];
  const location  = locations.find((l) => l.slug === ui.activeLocationSlug) ?? locations[0];
  const mealName  = location?.meals.some((m) => m.name === ui.activeMealPeriod) ? ui.activeMealPeriod! : defaultMeal(location);
  const meal      = location?.meals.find((m) => m.name === mealName);

  const isToday   = selectedDate === toLocalDateString();
  const dayLabel  = isToday ? "today" : `on ${SHORT_DAY.format(new Date(`${selectedDate}T12:00:00`))}`;
  const remaining = targets.calories - totals.calories;

  const mains = useMemo(
    () => pickMains(meal, { diets: activeDietaryFilters, highProtein, maxCalories: fitsBudget ? Math.max(0, remaining) : null }),
    [meal, activeDietaryFilters, highProtein, fitsBudget, remaining],
  );
  // For the empty state: would anything show without the budget?
  const mainsAnyBudget = useMemo(
    () => (mains.length || !fitsBudget ? mains : pickMains(meal, { diets: activeDietaryFilters, highProtein, maxCalories: null })),
    [mains, fitsBudget, meal, activeDietaryFilters, highProtein],
  );

  const placeName = location ? shortName(location.name) : "";
  const other     = locations.find((l) => l.slug !== location?.slug);

  function selectLocation(slug: string) {
    ui.setActiveLocation(slug);
    ui.setActiveMealPeriod(null);
  }

  function closeSearch() {
    setMenuSheet(null);
    ui.setSearchQuery(""); // the Worcester side reads the same query
  }

  return (
    <div className="page">
      {menuArea === "worcester" ? (
        <>
          <div data-tour="menu-controls" style={{ marginBottom: "1rem" }}>
            <MenuSearch />
          </div>
          <Suspense fallback={<div className="skeleton" style={{ height: 360, borderRadius: "var(--radius-lg)" }} />}>
            <WorcesterView onSelectItem={handleSelectItem} />
          </Suspense>
        </>
      ) : (
        <>
          <BudgetCard
            totals={totals}
            targets={targets}
            entries={entries}
            slot={meal ? mealSlotFor(meal.name) : null}
            dayLabel={dayLabel}
          />

          <div data-tour="menu-controls" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", margin: "0.9rem 0 0.4rem" }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: 50, borderRadius: "var(--radius-full)" }} />
            ) : locations.length > 0 && location && (
              <LocationSwitch
                locations={locations}
                slug={location.slug}
                meal={mealName}
                isToday={isToday}
                onSelect={selectLocation}
                onMeal={(m) => ui.setActiveMealPeriod(m)}
              />
            )}
            <MenuFilters />
          </div>

          {isLoading && <MainsSkeleton />}

          {error && !isLoading && (
            <div style={{
              padding: "1.25rem", marginTop: "0.75rem", borderRadius: "var(--radius-lg)",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              textAlign: "center",
            }}>
              <AlertIcon size={26} style={{ color: "#f87171", display: "block", margin: "0 auto 0.5rem" }} />
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#f87171", fontWeight: 600 }}>Couldn't load the menu</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                Check your connection, then try again.
              </p>
              <button className="btn-ghost" onClick={() => fetchMenu(selectedDate)} style={{ marginTop: "0.75rem" }}>Retry</button>
            </div>
          )}

          {!isLoading && !error && menuData && locations.length === 0 && (
            <Empty title="No dining service this day" body="Clark dining may be closed for a break or holiday." />
          )}

          {!isLoading && !error && location && (
            <LocationCardErrorBoundary key={`${location.slug}|${mealName}`} locationName={location.name}>
              {!meal ? (
                <Empty title={`${placeName} isn't serving ${dayLabel}`} body={other ? `Try ${shortName(other.name)}, or another day.` : "Try another day."} />
              ) : (
                <>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    margin: "1.1rem 0 0", paddingBottom: "0.6rem", borderBottom: "1px solid var(--color-border)",
                    fontSize: "0.875rem", color: "var(--color-text-3)",
                  }}>
                    <span>
                      <b style={{ color: "var(--color-text-1)", fontSize: "1rem", fontWeight: 750 }}>{fitsBudget ? "Mains that fit" : "Mains"}</b>
                      {" · "}{mains.length}
                    </span>
                    <span style={{ fontSize: "0.75rem" }}>Biggest first</span>
                  </div>

                  {mains.length > 0 ? (
                    mains.map(({ item, station }) => (
                      <DishRow key={item.id} item={item} where={station} remaining={remaining} onSelect={(i) => handleSelectItem(i, location.name, meal.name)} />
                    ))
                  ) : fitsBudget && mainsAnyBudget.length > 0 ? (
                    <Empty
                      title={remaining <= 0 ? `You've reached your calories ${dayLabel}` : `No main fits your ${formatWhole(remaining)} cal left`}
                      body={`${mainsAnyBudget.length} ${mainsAnyBudget.length === 1 ? "is" : "are"} on the menu if you want to go over, or search for something smaller.`}
                      action={{ label: "Show all mains", run: () => setFitsBudget(false) }}
                    />
                  ) : activeDietaryFilters.length > 0 || highProtein ? (
                    <Empty
                      title={`No ${filterWords(activeDietaryFilters, highProtein)} mains at ${placeName} for ${meal.name.toLowerCase()}`}
                      body={other ? `Try ${shortName(other.name)}, or search for anything that fits.` : "Search for anything that fits."}
                      action={other ? { label: `Try ${shortName(other.name)}`, run: () => selectLocation(other.slug) } : undefined}
                    />
                  ) : (
                    <Empty title="No mains listed for this meal" body="Search to see everything being served." />
                  )}

                  <button
                    className="glass pressable"
                    onClick={() => setMenuSheet("search")}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                      marginTop: "1rem", padding: "0.85rem 0.9rem 0.85rem 1rem", borderRadius: "var(--radius-xl)",
                      cursor: "pointer", textAlign: "left", color: "var(--color-text-1)",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 700 }}>Looking for something else?</span>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: 2 }}>
                        Search every dish at Higgins and The Bistro
                      </span>
                    </span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 0.85rem 0 0.7rem", flexShrink: 0,
                      borderRadius: "var(--radius-full)", background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)",
                      fontSize: "0.8rem", fontWeight: 700,
                    }}>
                      <SearchIcon size={15} strokeWidth={2.2} /> Search
                    </span>
                  </button>
                </>
              )}
            </LocationCardErrorBoundary>
          )}
        </>
      )}

      {menuSheet === "search" && menuArea === "clark" && (
        <MenuSearchSheet
          locations={locations}
          slug={location?.slug ?? ""}
          meal={mealName}
          remaining={remaining}
          onSelect={handleSelectItem}
          onClose={closeSearch}
        />
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

/** "vegan, high protein" for the empty state. */
function filterWords(diets: string[], highProtein: boolean): string {
  const words = DIET_CHIPS.filter((d) => diets.includes(d.icon)).map((d) => d.label.toLowerCase());
  if (highProtein) words.push("high-protein");
  return words.join(", ");
}

function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; run: () => void } }) {
  return (
    <div style={{ textAlign: "center", padding: "1.75rem 1rem 0.75rem" }}>
      <UtensilsIcon size={32} style={{ color: "var(--color-text-3)", display: "block", margin: "0 auto 0.6rem" }} />
      <p style={{ margin: 0, fontWeight: 650, color: "var(--color-text-1)" }}>{title}</p>
      <p style={{ margin: "0.35rem auto 0", maxWidth: 300, fontSize: "0.8rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>{body}</p>
      {action && (
        <button className="btn-ghost" onClick={action.run} style={{ marginTop: "0.85rem" }}>{action.label}</button>
      )}
    </div>
  );
}

/** Rows shaped like DishRow while the menu loads. */
function MainsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading menu" style={{ marginTop: "1.1rem" }}>
      <div className="skeleton" style={{ width: "40%", height: 16, marginBottom: 14 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.8rem 0", borderBottom: "1px solid var(--color-border)", opacity: 1 - i * 0.14 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <div className="skeleton" style={{ width: `${70 - i * 6}%`, height: 14 }} />
            <div className="skeleton" style={{ width: "55%", height: 11 }} />
          </div>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
        </div>
      ))}
    </div>
  );
}
