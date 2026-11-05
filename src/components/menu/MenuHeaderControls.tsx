/**
 * @file src/components/menu/MenuHeaderControls.tsx
 * @description The Menu tab's header: the day being browsed (tap to change),
 * and round Search and Filters buttons.
 */
import { useUIStore } from "@/stores";
import { ChevronDownIcon, SearchIcon, SlidersIcon } from "@/components/icons";
import { useActiveFilterCount } from "./FiltersSheet";

const ROUND: React.CSSProperties = {
  position: "relative", width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
  display: "grid", placeItems: "center",
  background: "var(--color-surface)", border: "1px solid var(--color-border-2)", color: "var(--color-text-1)",
};

/** Above the title: "Today, Nov 5 ▾", opening the day picker. */
export function MenuDateButton({ label }: { label: string }) {
  const setMenuSheet = useUIStore((s) => s.setMenuSheet);
  return (
    <button
      onClick={() => setMenuSheet("date")}
      aria-label={`${label}. Change day`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "0.15rem 0", margin: "-0.15rem 0",
        background: "none", border: "none", cursor: "pointer",
        fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-2)",
      }}
    >
      {label}
      <ChevronDownIcon size={12} strokeWidth={2.6} />
    </button>
  );
}

export default function MenuHeaderControls() {
  const { menuArea, setMenuSheet } = useUIStore();
  const filters = useActiveFilterCount(menuArea === "worcester");

  return (
    <div style={{ display: "flex", gap: 10, flexShrink: 0, marginBottom: 2 }}>
      <button className="pressable" onClick={() => setMenuSheet("search")} aria-label="Search" style={ROUND}>
        <SearchIcon size={19} strokeWidth={2.1} />
      </button>
      <button
        className="pressable"
        onClick={() => setMenuSheet("filters")}
        aria-label={filters ? `Filters, ${filters} on` : "Filters"}
        style={{ ...ROUND, borderColor: filters ? "var(--color-primary)" : "var(--color-border-2)" }}
      >
        <SlidersIcon size={19} strokeWidth={2.1} />
        {filters > 0 && (
          <span aria-hidden style={{
            position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, display: "grid", placeItems: "center",
            background: "var(--color-primary)", color: "#fff", fontSize: "0.66rem", fontWeight: 800,
            border: "2px solid var(--color-bg)",
          }}>
            {filters}
          </span>
        )}
      </button>
    </div>
  );
}
