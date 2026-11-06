/**
 * @file src/components/menu/MenuRow.tsx
 * @description One dish: name; calories, protein, carbs and fat; a tag (its
 * food group, or its station when the list is grouped by food group); and a
 * + that says the row opens the dish sheet to add it.
 */
import type { MenuItem } from "@/types";
import { PlusIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";
import { num } from "@/utils/menuHelpers";

export interface RowTag {
  label: string;
  /** A coloured dot before the label (food groups). */
  color?: string;
}

interface Props {
  item: MenuItem;
  tag?: RowTag;
  onSelect: (item: MenuItem) => void;
}

export default function MenuRow({ item, tag, onSelect }: Props) {
  const name = item.name ?? "Unknown item";
  const cal  = Math.round(num(item.calories));
  const macros = `P ${Math.round(num(item.protein))} · C ${Math.round(num(item.totalCarbs))} · F ${Math.round(num(item.totalFat))}`;

  return (
    <button
      className="pressable"
      onClick={() => onSelect(item)}
      aria-label={`${name}, ${item.isEstimate ? "about " : ""}${formatWhole(cal)} calories${tag ? `, ${tag.label}` : ""}`}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.75rem 0", background: "none", border: "none",
        textAlign: "left", cursor: "pointer", color: "var(--color-text-1)",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.94rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 5, minWidth: 0 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-2)", whiteSpace: "nowrap" }}>
            {item.isEstimate && "~"}{formatWhole(cal)} cal · {macros}
          </span>
          {tag && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0,
              padding: "0.12rem 0.55rem", borderRadius: "var(--radius-full)",
              background: "var(--color-surface-2)", fontSize: "0.72rem", color: "var(--color-text-1)",
            }}>
              {tag.color && <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: tag.color, flexShrink: 0 }} />}
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tag.label}</span>
            </span>
          )}
        </span>
      </span>
      <span aria-hidden style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        display: "grid", placeItems: "center",
        background: "var(--color-surface)", border: "1px solid var(--color-border-2)",
      }}>
        <PlusIcon size={17} strokeWidth={2.2} />
      </span>
    </button>
  );
}
