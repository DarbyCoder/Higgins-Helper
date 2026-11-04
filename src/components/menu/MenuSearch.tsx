/**
 * @file src/components/menu/MenuSearch.tsx
 * @description Search bar + dietary filter chip row for filtering menu items.
 */
import { useUIStore } from "@/stores";
import { SearchIcon, XIcon } from "@/components/icons";

const DIETARY_FILTERS = [
  { icon: "vegan",               label: "Vegan" },
  { icon: "vegetarian",          label: "Veg" },
  { icon: "made_without_gluten", label: "GF" },
  { icon: "halal",               label: "Halal" },
  { icon: "kosher",              label: "Kosher" },
];

export default function MenuSearch() {
  const { searchQuery, setSearchQuery, activeDietaryFilters, toggleDietaryFilter, clearDietaryFilters } = useUIStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)", pointerEvents: "none" }}>
          <SearchIcon size={16} />
        </span>
        <input
          id="menu-inline-search"
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
          }} aria-label="Clear search"><XIcon size={16} /></button>
        )}
      </div>

      {/* Dietary filter chips */}
      <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", scrollbarWidth: "none" }}>
        {DIETARY_FILTERS.map(({ icon, label }) => {
          const isActive = activeDietaryFilters.includes(icon);
          return (
            <button key={icon} onClick={() => toggleDietaryFilter(icon)} aria-pressed={isActive} style={{
              flexShrink: 0,
              padding: "0.28rem 0.7rem",
              borderRadius: "var(--radius-full)",
              // One "on" style for every filter: teal, like the rest of the app's selections
              border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
              background: isActive ? "var(--color-primary-ghost)" : "transparent",
              color: isActive ? "var(--color-primary-light)" : "var(--color-text-2)",
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
