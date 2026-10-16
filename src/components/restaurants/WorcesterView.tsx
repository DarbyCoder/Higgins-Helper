/**
 * @file src/components/restaurants/WorcesterView.tsx
 * @description The Menu tab's Worcester side: a map of restaurants around
 * Clark, a list grouped by area, and a bottom sheet with the chosen
 * restaurant's menu. Items open MenuPage's NutritionModal, so logging works
 * exactly like the Higgins menu.
 *
 * Lazy-loaded by MenuPage, which keeps Leaflet out of the main bundle.
 */
import { useCallback, useMemo, useState } from "react";
import type { MenuItem, Restaurant } from "@/types";
import { useDateStore, useUIStore } from "@/stores";
import { RESTAURANT_AREAS, WORCESTER_RESTAURANTS } from "@/data/worcesterRestaurants";
import {
  distanceFromClark,
  formatDistance,
  isRestaurantOpenNow,
  restaurantMatches,
} from "@/utils/restaurants";
import RestaurantMap from "./RestaurantMap";
import RestaurantMenuSheet from "./RestaurantMenuSheet";

interface Props {
  onSelectItem: (item: MenuItem, locationName: string, mealName?: string) => void;
}

export default function WorcesterView({ onSelectItem }: Props) {
  const { selectedDate } = useDateStore();
  const { searchQuery, activeDietaryFilters } = useUIStore();
  const [selected, setSelected] = useState<Restaurant | null>(null);

  const visible = useMemo(
    () => WORCESTER_RESTAURANTS.filter((r) => restaurantMatches(r, searchQuery, activeDietaryFilters)),
    [searchQuery, activeDietaryFilters]
  );

  // Open/closed is read off the clock at render time, like LocationCard does
  const openSlugs = new Set(visible.filter((r) => isRestaurantOpenNow(r, selectedDate)).map((r) => r.slug));

  const closeSheet = useCallback(() => setSelected(null), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <RestaurantMap restaurants={visible} openSlugs={openSlugs} onSelect={setSelected} />

      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍽️</div>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-1)" }}>No matching restaurants</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--color-text-3)" }}>
            No nearby menu has an item that matches your search and filters.
          </p>
        </div>
      ) : (
        RESTAURANT_AREAS.map((area) => {
          // Open places first, then nearest
          const inArea = visible
            .filter((r) => r.area === area.id)
            .sort((a, b) =>
              Number(openSlugs.has(b.slug)) - Number(openSlugs.has(a.slug)) ||
              distanceFromClark(a) - distanceFromClark(b)
            );
          if (inArea.length === 0) return null;

          return (
            <div key={area.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="section-title" style={{ marginBottom: "0.25rem" }}>
                {area.label} ({inArea.length})
              </div>
              {inArea.map((r) => (
                <RestaurantRow key={r.slug} restaurant={r} isOpen={openSlugs.has(r.slug)} onSelect={setSelected} />
              ))}
            </div>
          );
        })
      )}

      <RestaurantMenuSheet
        restaurant={selected}
        date={selectedDate}
        onClose={closeSheet}
        onSelectItem={onSelectItem}
      />
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function RestaurantRow({ restaurant, isOpen, onSelect }: {
  restaurant: Restaurant;
  isOpen: boolean;
  onSelect: (restaurant: Restaurant) => void;
}) {
  return (
    <button
      className="glass"
      onClick={() => onSelect(restaurant)}
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.8rem 1rem",
        cursor: "pointer",
        color: "inherit", font: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-1)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {restaurant.name}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-3)", marginTop: "0.1rem" }}>
          {restaurant.cuisine} · {formatDistance(distanceFromClark(restaurant))}
        </div>
      </div>

      {/* Same badge as LocationCard's header */}
      <span style={{
        flexShrink: 0,
        padding: "0.2rem 0.65rem",
        borderRadius: "var(--radius-full)",
        fontSize: "0.65rem", fontWeight: 700,
        background: isOpen ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        color: isOpen ? "#34d399" : "#f87171",
      }}>
        {isOpen ? "Open" : "Closed"}
      </span>

      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-text-3)" strokeWidth={2} strokeLinecap="round"
        style={{ flexShrink: 0 }}
        aria-hidden
      >
        <polyline points="9,18 15,12 9,6" />
      </svg>
    </button>
  );
}
