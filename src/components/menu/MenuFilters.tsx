/**
 * @file src/components/menu/MenuFilters.tsx
 * @description A row of filter chips (Fits budget, High protein, the diets)
 * for the search sheet, so filters can change without leaving it. The same
 * filters as the header's Filters sheet.
 */
import { useUIStore } from "@/stores";
import { DIET_CHIPS } from "./FiltersSheet";

export default function MenuFilters({ showBudget = true }: { showBudget?: boolean }) {
  const { fitsBudget, setFitsBudget, highProtein, setHighProtein, activeDietaryFilters, toggleDietaryFilter } = useUIStore();

  const chips = [
    ...(showBudget ? [{ key: "budget", label: "Fits budget", on: fitsBudget, toggle: () => setFitsBudget(!fitsBudget) }] : []),
    { key: "protein", label: "High protein", on: highProtein, toggle: () => setHighProtein(!highProtein) },
    ...DIET_CHIPS.map((d) => ({ key: d.icon, label: d.label, on: activeDietaryFilters.includes(d.icon), toggle: () => toggleDietaryFilter(d.icon) })),
  ];

  return (
    <div className="no-scrollbar" style={{ display: "flex", gap: 7, overflowX: "auto", margin: "0 -1rem", padding: "0 1rem" }}>
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.toggle}
          aria-pressed={c.on}
          className="pressable"
          style={{
            flexShrink: 0, padding: "0.45rem 0.85rem",
            borderRadius: "var(--radius-full)", cursor: "pointer",
            border: `1px solid ${c.on ? "var(--color-primary)" : "var(--color-border-2)"}`,
            background: c.on ? "var(--color-primary-ghost)" : "transparent",
            color: c.on ? "var(--color-primary-light)" : "var(--color-text-2)",
            fontSize: "0.8rem", fontWeight: 600,
            transition: "background 0.18s, border-color 0.18s, color 0.18s",
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
