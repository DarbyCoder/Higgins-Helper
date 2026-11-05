/**
 * @file src/components/menu/FiltersSheet.tsx
 * @description The Menu's filters, behind the header's sliders button:
 * Fits budget, High protein and the diets. They narrow the dish lists and
 * search alike; on Worcester, only the diets apply.
 */
import { useUIStore } from "@/stores";
import Sheet from "@/components/ui/Sheet";
import Switch from "@/components/ui/Switch";
import { HIGH_PROTEIN_G } from "@/utils/menuHelpers";
import { formatWhole } from "@/utils/format";

export const DIET_CHIPS = [
  { icon: "vegan",               label: "Vegan" },
  { icon: "vegetarian",          label: "Vegetarian" },
  { icon: "made_without_gluten", label: "Gluten-free" },
  { icon: "halal",               label: "Halal" },
  { icon: "kosher",              label: "Kosher" },
];

/** How many filters are on, for the header button's badge. */
export function useActiveFilterCount(dietsOnly: boolean): number {
  const { fitsBudget, highProtein, activeDietaryFilters } = useUIStore();
  return activeDietaryFilters.length + (dietsOnly ? 0 : Number(fitsBudget) + Number(highProtein));
}

interface Props {
  /** Calories left today, for Fits budget. */
  remaining: number;
  dietsOnly: boolean;
  onClose: () => void;
}

export default function FiltersSheet({ remaining, dietsOnly, onClose }: Props) {
  const ui = useUIStore();
  const count = useActiveFilterCount(dietsOnly);

  function clearAll() {
    ui.clearDietaryFilters();
    if (!dietsOnly) { ui.setFitsBudget(false); ui.setHighProtein(false); }
  }

  return (
    <Sheet title="Filters" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingBottom: "0.75rem" }}>
        {!dietsOnly && (
          <div style={{ borderRadius: "var(--radius-lg)", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <ToggleRow
              label="Fits budget"
              detail={remaining > 0 ? `Only dishes within your ${formatWhole(remaining)} cal left` : "You've used today's calories, so this hides everything"}
              checked={ui.fitsBudget}
              onChange={() => ui.setFitsBudget(!ui.fitsBudget)}
            />
            <div style={{ height: 1, background: "var(--color-border)", marginLeft: "1rem" }} />
            <ToggleRow
              label="High protein"
              detail={`${HIGH_PROTEIN_G} g of protein or more`}
              checked={ui.highProtein}
              onChange={() => ui.setHighProtein(!ui.highProtein)}
            />
          </div>
        )}

        <div>
          <div className="section-title" style={{ marginBottom: "0.6rem" }}>Diet</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DIET_CHIPS.map((d) => {
              const on = ui.activeDietaryFilters.includes(d.icon);
              return (
                <button
                  key={d.icon}
                  onClick={() => ui.toggleDietaryFilter(d.icon)}
                  aria-pressed={on}
                  className="pressable"
                  style={{
                    padding: "0.55rem 1rem", borderRadius: "var(--radius-full)", cursor: "pointer",
                    border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border-2)"}`,
                    background: on ? "var(--color-primary-ghost)" : "transparent",
                    color: on ? "var(--color-primary-light)" : "var(--color-text-2)",
                    fontSize: "0.85rem", fontWeight: 600,
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
            Your diets from Profile are on to start with.
          </p>
        </div>

        {count > 0 && (
          <button className="btn-ghost" onClick={clearAll} style={{ alignSelf: "flex-start" }}>
            Clear all filters
          </button>
        )}
      </div>
    </Sheet>
  );
}

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.92rem", fontWeight: 650, color: "var(--color-text-1)" }}>{label}</div>
        <div style={{ fontSize: "0.76rem", color: "var(--color-text-2)", marginTop: 2, lineHeight: 1.4 }}>{detail}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
