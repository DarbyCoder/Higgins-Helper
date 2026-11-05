/**
 * @file src/components/menu/GroupBySwitch.tsx
 * @description "Group by  Food group | Station" above the dish list.
 */
import { useUIStore } from "@/stores";
import type { MenuGroupBy } from "@/stores/useUIStore";

const OPTIONS: { value: MenuGroupBy; label: string }[] = [
  { value: "food",    label: "Food group" },
  { value: "station", label: "Station" },
];

export default function GroupBySwitch() {
  const { menuGroupBy, setMenuGroupBy } = useUIStore();
  const index = OPTIONS.findIndex((o) => o.value === menuGroupBy);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
      <span id="group-by-label" style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-2)", flexShrink: 0 }}>
        Group by
      </span>
      <div role="radiogroup" aria-labelledby="group-by-label" style={{
        position: "relative", flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", padding: 4,
        borderRadius: "var(--radius-full)", background: "var(--color-surface)", border: "1px solid var(--color-border-2)",
      }}>
        <span aria-hidden style={{
          position: "absolute", top: 4, bottom: 4, left: 4, width: "calc(50% - 4px)",
          borderRadius: "var(--radius-full)", background: "var(--color-text-1)",
          transform: `translateX(${index * 100}%)`,
          transition: "transform 0.28s cubic-bezier(0.2,0.9,0.25,1)",
        }} />
        {OPTIONS.map((o) => {
          const on = o.value === menuGroupBy;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={on}
              onClick={() => setMenuGroupBy(o.value)}
              style={{
                position: "relative", height: 38, background: "none", border: "none", cursor: "pointer",
                fontSize: "0.88rem", fontWeight: 700,
                color: on ? "var(--color-bg)" : "var(--color-text-2)", transition: "color 0.2s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
