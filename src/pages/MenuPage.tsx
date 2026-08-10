/**
 * @file src/pages/MenuPage.tsx
 * @description Browse the Clark dining menu for the selected date.
 * Fetches from the backend API, shows per-location collapsible cards,
 * and opens the NutritionModal on item tap.
 */
import { useEffect, useState } from "react";
import { useDateStore, useMenuStore } from "@/stores";
import type { MenuItem } from "@/types";
import DatePicker from "@/components/menu/DatePicker";
import MenuSearch from "@/components/menu/MenuSearch";
import LocationCard from "@/components/menu/LocationCard";
import NutritionModal from "@/components/menu/NutritionModal";

export default function MenuPage() {
  const { selectedDate } = useDateStore();
  const { menuData, isLoading, error, fetchMenu } = useMenuStore();

  const [selectedItem, setSelectedItem]     = useState<MenuItem | null>(null);
  const [selectedLocation, setSelectedLoc]  = useState("");

  // Fetch menu whenever the selected date changes
  useEffect(() => { fetchMenu(selectedDate); }, [selectedDate, fetchMenu]);

  function handleSelectItem(item: MenuItem, locationName: string) {
    setSelectedItem(item);
    setSelectedLoc(locationName);
  }

  const openLocations = menuData?.locations.filter((l) => l.isOpen) ?? [];
  const closedLocations = menuData?.locations.filter((l) => !l.isOpen) ?? [];

  return (
    <div className="page">
      {/* Header controls */}
      <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <DatePicker />
        <MenuSearch />
      </div>

      {/* Fetch timing meta */}
      {menuData && (
        <div style={{ fontSize: "0.65rem", color: "var(--color-text-3)", marginBottom: "0.75rem" }}>
          Updated {new Date(menuData.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[1, 2].map((i) => (
            <div key={i} style={{
              height: 120, borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      )}

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
            <div key={loc.slug} className="glass-2" style={{ padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-2)" }}>{loc.name}</span>
              <span style={{ fontSize: "0.65rem", color: "#f87171", fontWeight: 600 }}>Closed</span>
            </div>
          ))}
        </div>
      )}

      {/* Nutrition detail modal */}
      <NutritionModal
        item={selectedItem}
        locationName={selectedLocation}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
