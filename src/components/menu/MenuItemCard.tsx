/**
 * @file src/components/menu/MenuItemCard.tsx
 * @description One dish in a station: name, serving size and diet badges on
 * the left; calories with a thin bar showing the protein/carbs/fat split on
 * the right; and a + that says the row opens the dish sheet to add it.
 */
import type { MenuItem } from "@/types";
import DietBadges from "@/components/nutrition/DietBadges";
import { PlusIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";

interface Props {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

/** Guard: numeric fields may be null/NaN from unusual nutrition JSON blobs. */
const num = (n: number) => (Number.isFinite(n) ? n : 0);

export default function MenuItemCard({ item, onSelect }: Props) {
  const calories = num(item.calories);
  const protein  = num(item.protein);
  const carbs    = num(item.totalCarbs);
  const fat      = num(item.totalFat);

  // Calories from each: 4 kcal per gram of protein or carbs, 9 per gram of fat
  const split = [
    { label: "Protein", kcal: protein * 4, color: "var(--color-protein)" },
    { label: "Carbs",   kcal: carbs * 4,   color: "var(--color-carbs)" },
    { label: "Fat",     kcal: fat * 9,     color: "var(--color-fat)" },
  ];
  const splitTotal = split.reduce((a, p) => a + p.kcal, 0);

  return (
    <button
      onClick={() => onSelect(item)}
      aria-label={`${item.name ?? "Unknown item"}, ${item.isEstimate ? "about " : ""}${formatWhole(calories)} calories`}
      className="pressable"
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.75rem 0.75rem 0.75rem 0.9rem",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        color: "var(--color-text-1)",
      }}
    >
      {/* Name, serving, diets */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name ?? "Unknown item"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: 4, minWidth: 0, overflow: "hidden" }}>
          {item.servingSize && (
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-3)", whiteSpace: "nowrap", flexShrink: 0 }}>
              {item.servingSize}
            </span>
          )}
          <DietBadges attributes={item.attributes} compact />
        </div>
      </div>

      {/* Calories and the macro split */}
      <div style={{ flexShrink: 0, width: 54, textAlign: "right" }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
          {/* "~" marks estimated nutrition (Worcester restaurant items) */}
          {item.isEstimate && "~"}{formatWhole(calories)}
          <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--color-text-3)", marginLeft: 2 }}>cal</span>
        </div>
        {splitTotal > 0 && (
          <div
            title={split.map((p) => `${p.label} ${Math.round((p.kcal / splitTotal) * 100)}%`).join(" · ")}
            style={{ display: "flex", gap: 1.5, height: 4, borderRadius: 99, overflow: "hidden", marginTop: 6, marginLeft: "auto", width: 48 }}
          >
            {split.map((p) => p.kcal > 0 && <div key={p.label} style={{ flex: p.kcal, background: p.color }} />)}
          </div>
        )}
      </div>

      {/* Add */}
      <span aria-hidden style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        display: "grid", placeItems: "center",
        background: "var(--color-primary-ghost)", color: "var(--color-primary-light)",
      }}>
        <PlusIcon size={15} strokeWidth={2.4} />
      </span>
    </button>
  );
}
