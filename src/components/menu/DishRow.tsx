/**
 * @file src/components/menu/DishRow.tsx
 * @description One dish in the Menu list or search: name; calories and
 * protein/carbs/fat with a Fits or Over badge against the calories left today;
 * the station; and a + that says the row opens the dish sheet to add it.
 */
import type { MenuItem } from "@/types";
import { PlusIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";
import { num, stationLabel } from "@/utils/mains";

interface Props {
  item: MenuItem;
  /** Station, or "Higgins · Dinner" in search. */
  where?: string;
  /** Calories left today: the badge says whether the dish fits. */
  remaining: number;
  onSelect: (item: MenuItem) => void;
}

export default function DishRow({ item, where, remaining, onSelect }: Props) {
  const cal  = Math.round(num(item.calories));
  const over = cal - Math.max(0, Math.round(remaining));
  const name = item.name ?? "Unknown item";

  return (
    <button
      className="pressable"
      onClick={() => onSelect(item)}
      aria-label={`${name}, ${formatWhole(cal)} calories, ${over > 0 ? `${over} over what's left` : "fits what's left"}`}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.7rem 0", background: "none", border: "none",
        borderBottom: "1px solid var(--color-border)",
        textAlign: "left", cursor: "pointer", color: "var(--color-text-1)",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.94rem", fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: 4, fontSize: "0.78rem", color: "var(--color-text-2)", whiteSpace: "nowrap", overflow: "hidden" }}>
          <span style={{ color: "var(--color-text-1)", fontWeight: 600 }}>{formatWhole(cal)} cal</span>
          <span style={{ color: "var(--color-text-3)" }}>·</span>
          <span>P {Math.round(num(item.protein))}&ensp;C {Math.round(num(item.totalCarbs))}&ensp;F {Math.round(num(item.totalFat))}</span>
          <span style={{
            marginLeft: 2, padding: "0.1rem 0.5rem", borderRadius: "var(--radius-full)",
            fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
            background: over > 0 ? "color-mix(in srgb, var(--color-streak) 15%, transparent)" : "var(--color-primary-ghost)",
            color: over > 0 ? "var(--color-streak)" : "var(--color-primary-light)",
          }}>
            {over > 0 ? `Over ${formatWhole(over)}` : "Fits"}
          </span>
        </span>
        {where && (
          <span style={{ display: "block", marginTop: 3, fontSize: "0.72rem", color: "var(--color-text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {stationLabel(where)}
          </span>
        )}
      </span>
      <span aria-hidden style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        display: "grid", placeItems: "center",
        background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)",
      }}>
        <PlusIcon size={16} strokeWidth={2.2} />
      </span>
    </button>
  );
}
