/**
 * @file src/components/menu/MenuSearch.tsx
 * @description Search bar + dietary filter chip row for filtering menu items.
 */
import { useUIStore } from "@/stores";

const DIETARY_FILTERS = [
  { icon: "vegan",              label: "Vegan",       color: "#10b981" },
  { icon: "vegetarian",         label: "Veg",         color: "#22c55e" },
  { icon: "made_without_gluten",label: "GF",          color: "#f59e0b" },
  { icon: "halal",              label: "Halal",       color: "#3b82f6" },
  { icon: "kosher",             label: "Kosher",      color: "#8b5cf6" },
];

export default function MenuSearch() {
  const { searchQuery, setSearchQuery, activeDietaryFilters, toggleDietaryFilter, clearDietaryFilters } = useUIStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)", pointerEvents: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          className="input"
          style={{ paddingLeft: "2.25rem", paddingRight: searchQuery ? "2.25rem" : undefined }}
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search menu items"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} style={{
            position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)", padding: 0,
          }}>✕</button>
        )}
      </div>

      {/* Dietary filter chips */}
      <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", scrollbarWidth: "none" }}>
        {DIETARY_FILTERS.map(({ icon, label, color }) => {
          const isActive = activeDietaryFilters.includes(icon);
          return (
            <button key={icon} onClick={() => toggleDietaryFilter(icon)} style={{
              flexShrink: 0,
              padding: "0.28rem 0.7rem",
              borderRadius: "var(--radius-full)",
              border: `1px solid ${isActive ? color : "var(--color-border)"}`,
              background: isActive ? `${color}22` : "transparent",
              color: isActive ? color : "var(--color-text-3)",
              fontSize: "0.7rem", fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.18s",
            }}>
              {label}
            </button>
          );
        })}
        {activeDietaryFilters.length > 0 && (
          <button onClick={clearDietaryFilters} style={{
            flexShrink: 0,
            padding: "0.28rem 0.7rem",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--color-border)",
            background: "transparent",
            color: "var(--color-text-3)",
            fontSize: "0.7rem", fontWeight: 500,
            cursor: "pointer",
          }}>Clear</button>
        )}
      </div>
    </div>
  );
}
