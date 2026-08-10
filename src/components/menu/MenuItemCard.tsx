/**
 * @file src/components/menu/MenuItemCard.tsx
 * @description A single menu item row showing name, key macros, dietary badges,
 * and a + button to open the NutritionModal for details and logging.
 */
import type { MenuItem } from "@/types";

interface Props {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onSelect }: Props) {
  // Show at most 3 dietary icons
  const visibleAttrs = item.attributes.slice(0, 3);

  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.65rem 0.75rem",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "all 0.16s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-3)"; e.currentTarget.style.borderColor = "var(--color-border-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
    >
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2 }}>
          {item.servingSize}
        </div>
        {/* Dietary badges */}
        {visibleAttrs.length > 0 && (
          <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
            {visibleAttrs.map((a) => (
              <span key={a.icon} style={{
                fontSize: "0.58rem", fontWeight: 700, color: "#34d399",
                background: "rgba(16,185,129,0.1)", padding: "0.1rem 0.35rem",
                borderRadius: "999px",
              }}>
                {a.icon.replace(/_/g, " ")}
              </span>
            ))}
            {item.attributes.length > 3 && (
              <span style={{ fontSize: "0.58rem", color: "var(--color-text-3)" }}>+{item.attributes.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Calorie + macro mini-column */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-primary-light)" }}>
          {item.calories}
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)", lineHeight: 1.3 }}>
          kcal
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--color-text-3)", marginTop: 2 }}>
          P:{item.protein.toFixed(0)}g C:{item.totalCarbs.toFixed(0)}g
        </div>
      </div>

      {/* Add chevron */}
      <div style={{ color: "var(--color-text-3)", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polyline points="9,18 15,12 9,6" />
        </svg>
      </div>
    </button>
  );
}
