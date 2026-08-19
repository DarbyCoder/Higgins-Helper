/**
 * @file src/components/menu/LocationCard.tsx
 * @description Collapsible card for a single dining location.
 * Shows location name, open/closed status, meal period tabs,
 * and a filterable list of food stations + items.
 *
 * Station collapse: every station is independently toggleable.
 * All stations start expanded. Clicking the header toggles that one station.
 */
import { useState } from "react";
import type { DiningLocation, FoodStation, MenuItem } from "@/types";
import { useUIStore } from "@/stores";
import MenuItemCard from "./MenuItemCard";

interface Props {
  location: DiningLocation;
  onSelectItem: (item: MenuItem, locationName: string, mealName?: string) => void;
}

export default function LocationCard({ location, onSelectItem }: Props) {
  // ── Meal tab state ──────────────────────────────────────────────────────
  const [activeMeal, setActiveMeal] = useState(() => {
    if (location.meals.length === 0) return "";
    
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // 1. Find currently active meal based on time
    const current = location.meals.find(m => {
      if (!m.startTime || !m.endTime) return false;
      const [sh, sm] = m.startTime.split(":").map(Number);
      const [eh, em] = m.endTime.split(":").map(Number);
      if (isNaN(sh) || isNaN(eh)) return false;
      return nowMins >= (sh * 60 + sm) && nowMins < (eh * 60 + em);
    });
    if (current) return current.name;

    // 2. Find next upcoming meal
    const next = location.meals.find(m => {
      if (!m.startTime) return false;
      const [sh, sm] = m.startTime.split(":").map(Number);
      if (isNaN(sh)) return false;
      return (sh * 60 + sm) > nowMins;
    });
    if (next) return next.name;

    // 3. Fallback: If no current or upcoming meals were found, 
    // it means it's late at night (after hours). Default to the last meal (Dinner).
    return location.meals[location.meals.length - 1]?.name ?? "";
  });

  // ── Per-station collapse state ──────────────────────────────────────────
  // A Set of station IDs that are COLLAPSED. Seeded with every station ID
  // so all stations start collapsed. Empty Set would mean all expanded.
  const [collapsedStations, setCollapsed] = useState<Set<string>>(
    () => new Set(location.meals.flatMap((m) => m.stations.map((s) => s.id)))
  );

  const [isCardExpanded, setIsCardExpanded] = useState(true);

  const { searchQuery, activeDietaryFilters } = useUIStore();

  const currentMeal =
    location.meals.find((m) => m.name === activeMeal) ?? location.meals[0];

  function filterItems(items: MenuItem[]): MenuItem[] {
    let filtered = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (activeDietaryFilters.length > 0) {
      filtered = filtered.filter((i) =>
        activeDietaryFilters.every((f) => i.attributes.some((a) => a.icon === f))
      );
    }
    return filtered;
  }

  function toggleStation(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id); // was collapsed → now expanded
      } else {
        next.add(id);    // was expanded  → now collapsed
      }
      return next;
    });
  }

  const totalItems =
    currentMeal?.stations.reduce((acc, s) => acc + filterItems(s.items).length, 0) ?? 0;

  let isCurrentlyClosed = !location.isOpen || location.meals.length === 0;
  if (!isCurrentlyClosed) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const hasActiveMeal = location.meals.some(m => {
      if (!m.startTime || !m.endTime) return false;
      const [sh, sm] = m.startTime.split(":").map(Number);
      const [eh, em] = m.endTime.split(":").map(Number);
      if (isNaN(sh) || isNaN(eh)) return false;
      return nowMins >= (sh * 60 + sm) && nowMins < (eh * 60 + em);
    });
    if (!hasActiveMeal) {
      isCurrentlyClosed = true;
    }
  }

  return (
    <div className="glass" style={{ overflow: "hidden" }}>
      {/* ── Location Header ── */}
      <div 
        style={{ padding: "0.9rem 1rem 0.75rem", cursor: "pointer" }}
        onClick={() => setIsCardExpanded(!isCardExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-text-1)" }}>
              {location.name}
            </h3>
            {currentMeal && isCardExpanded && (
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.7rem", color: "var(--color-text-3)" }}>
                {currentMeal.name}
                {currentMeal.startTime && currentMeal.endTime
                  ? `: ${currentMeal.startTime} – ${currentMeal.endTime}`
                  : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{
              padding: "0.2rem 0.65rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.65rem", fontWeight: 700,
              background: isCurrentlyClosed ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              color: isCurrentlyClosed ? "#f87171" : "#34d399",
            }}>
              {isCurrentlyClosed ? "Closed" : "Open"}
            </span>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-text-3)" strokeWidth={2} strokeLinecap="round"
              style={{
                transform: isCardExpanded ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>
        </div>

        {/* ── Meal period tabs ── */}
        {location.meals.length > 1 && isCardExpanded && (
          <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.6rem", overflowX: "auto", scrollbarWidth: "none" }}>
            {location.meals.map((meal, idx) => {
              const isActive = meal.name === activeMeal;
              return (
                <button key={idx} onClick={(e) => { e.stopPropagation(); setActiveMeal(meal.name); }} style={{
                  flexShrink: 0, fontSize: "0.72rem", fontWeight: 600,
                  padding: "0.25rem 0.7rem",
                  borderRadius: "var(--radius-full)",
                  border: isActive ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: isActive ? "var(--color-primary-ghost)" : "transparent",
                  color: isActive ? "var(--color-primary-light)" : "var(--color-text-3)",
                  cursor: "pointer",
                  transition: "all 0.16s",
                }}>
                  {meal.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isCardExpanded && (
        location.meals.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-3)", fontSize: "0.8rem" }}>
            No menu available for this date
          </div>
        ) : totalItems === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-3)", fontSize: "0.8rem" }}>
            No items match your search
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--color-border)" }}>
            {currentMeal?.stations.map((station: FoodStation) => {
              const items = filterItems(station.items);
              if (items.length === 0) return null;

              // Station is expanded unless its ID is in the collapsed set
              const isExpanded = !collapsedStations.has(station.id);

              return (
                <div key={station.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {/* Station header toggle */}
                  <button
                    onClick={() => toggleStation(station.id)}
                    aria-expanded={isExpanded}
                    style={{
                      width: "100%", textAlign: "left", padding: "0.6rem 1rem",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-1)", textTransform: "capitalize" }}>
                        {station.name}
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--color-text-3)", marginLeft: "0.4rem" }}>
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-text-3)" strokeWidth={2} strokeLinecap="round"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </button>

                  {/* Items list */}
                  {isExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", padding: "0 0.75rem 0.75rem" }}>
                      {items.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          onSelect={(i) => onSelectItem(i, location.name, currentMeal?.name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
