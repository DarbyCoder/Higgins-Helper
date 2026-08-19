/**
 * @file src/pages/MenuPage.tsx
 * @description Browse the Clark dining menu for the selected date.
 * Fetches from the backend API, shows per-location collapsible cards,
 * and opens the NutritionModal on item tap.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { useDateStore, useMenuStore } from "@/stores";
import type { MenuItem, DiningLocation } from "@/types";

import MenuSearch from "@/components/menu/MenuSearch";
import LocationCard from "@/components/menu/LocationCard";
import NutritionModal from "@/components/menu/NutritionModal";

export default function MenuPage() {
  const { selectedDate } = useDateStore();
  const { menuData, isLoading, error, fetchMenu } = useMenuStore();

  const [selectedItem, setSelectedItem]     = useState<MenuItem | null>(null);
  const [selectedLocation, setSelectedLoc]  = useState("");
  const [selectedMeal, setSelectedMeal]     = useState("");

  // Fetch menu whenever the selected date changes
  useEffect(() => { fetchMenu(selectedDate); }, [selectedDate, fetchMenu]);

  function handleSelectItem(item: MenuItem, locationName: string, mealName?: string) {
    setSelectedItem(item);
    setSelectedLoc(locationName);
    if (mealName) setSelectedMeal(mealName);
  }

  function isLocationOpenNow(l: DiningLocation) {
    if (!l.isOpen) return false;
    if (l.meals.length === 0) return false;
    
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    return l.meals.some(m => {
      if (!m.startTime || !m.endTime) return false;
      const [sh, sm] = m.startTime.split(":").map(Number);
      const [eh, em] = m.endTime.split(":").map(Number);
      if (isNaN(sh) || isNaN(eh)) return false;
      return nowMins >= (sh * 60 + sm) && nowMins < (eh * 60 + em);
    });
  }

  const openLocations = menuData?.locations.filter(isLocationOpenNow) ?? [];
  const closedLocations = menuData?.locations.filter((l) => !isLocationOpenNow(l)) ?? [];

  return (
    <div className="page">
      {/* Header controls */}
      <div style={{ marginBottom: "1rem" }}>
        <MenuSearch />
      </div>

      {/* Fetch timing meta */}
      {menuData && (
        <div style={{ fontSize: "0.65rem", color: "var(--color-text-3)", marginBottom: "0.75rem" }}>
          Updated {new Date(menuData.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Loading state — shimmer skeletons shaped like real LocationCards */}
      {isLoading && <MenuLoadingSkeleton />}

      {/* Error state */}
      {error && !isLoading && (
        <div style={{
          padding: "1.25rem", borderRadius: "var(--radius-lg)",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#f87171", fontWeight: 600 }}>
            Couldn't load menu data
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "var(--color-text-3)" }}>
            Make sure the API server is running, then try again.
          </p>
          <button className="btn-ghost" onClick={() => fetchMenu(selectedDate)} style={{ marginTop: "0.75rem" }}>
            Retry
          </button>
        </div>
      )}

      {/* No data for date */}
      {!isLoading && !error && menuData && menuData.locations.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍽️</div>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-1)" }}>No dining service today</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--color-text-3)" }}>
            Clark dining may be closed for a break or holiday.
          </p>
        </div>
      )}

      {/* Open locations */}
      {!isLoading && openLocations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div className="section-title">Open Now ({openLocations.length})</div>
          {openLocations.map((loc) => (
            <LocationCard key={loc.slug} location={loc} onSelectItem={handleSelectItem} />
          ))}
        </div>
      )}

      {/* Closed locations */}
      {!isLoading && closedLocations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="section-title">Closed ({closedLocations.length})</div>
          {closedLocations.map((loc) => (
            <LocationCard key={loc.slug} location={loc} onSelectItem={handleSelectItem} />
          ))}
        </div>
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

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

/**
 * Renders three shimmer-animated cards that mirror the real LocationCard shape:
 *   - Header row (location name + status badge)
 *   - Subtitle line (meal period + hours)
 *   - Tab chip row (meal period pills)
 *   - Two station rows (station label + item stubs)
 *
 * Uses the `.skeleton` shimmer class from index.css — no extra keyframes needed.
 */
function MenuLoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} delay={i * 0.12} />
      ))}
    </div>
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  const sk = (w: string, h: string, radius = "var(--radius-sm)") => ({
    width: w,
    height: h,
    borderRadius: radius,
  } as CSSProperties);

  return (
    <div
      className="glass"
      style={{
        overflow: "hidden",
        opacity: 0,
        animation: `fade-up 0.4s ease ${delay}s forwards`,
      }}
    >
      {/* Header */}
      <div style={{ padding: "0.9rem 1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Location name */}
          <div className="skeleton" style={sk("55%", "1rem")} />
          {/* Status badge */}
          <div className="skeleton" style={sk("3.5rem", "1.4rem", "var(--radius-full)")} />
        </div>

        {/* Subtitle: meal period + hours */}
        <div className="skeleton" style={sk("40%", "0.65rem")} />

        {/* Meal tab chips */}
        <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.1rem" }}>
          {["4rem", "3.2rem", "3.6rem"].map((w, j) => (
            <div key={j} className="skeleton" style={sk(w, "1.5rem", "var(--radius-full)")} />
          ))}
        </div>
      </div>

      {/* Station rows */}
      <div style={{ borderTop: "1px solid var(--color-border)" }}>
        {[3, 2].map((itemCount, si) => (
          <div
            key={si}
            style={{ borderBottom: si === 0 ? "1px solid var(--color-border)" : "none" }}
          >
            {/* Station header */}
            <div style={{ padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="skeleton" style={sk("35%", "0.75rem")} />
              <div className="skeleton" style={sk("2rem", "0.6rem")} />
            </div>

            {/* Item stubs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0 0.75rem 0.75rem" }}>
              {Array.from({ length: itemCount }).map((_, ii) => (
                <div
                  key={ii}
                  className="skeleton"
                  style={{
                    height: "3.2rem",
                    borderRadius: "var(--radius-md)",
                    // Vary widths slightly so it doesn't look like a grid
                    opacity: 1 - ii * 0.08,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
