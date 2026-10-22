/**
 * @file src/components/menu/AreaSwitch.tsx
 * @description Segmented "Clark | Worcester" switch at the top of the Menu tab.
 * Clark shows the Higgins dining menu; Worcester shows nearby restaurants.
 * The highlight slides with the same spring as the Profile page theme switch.
 */
import { useUIStore } from "@/stores";
import type { MenuArea } from "@/stores/useUIStore";

const OPTIONS: { value: MenuArea; label: string }[] = [
  { value: "clark",     label: "Clark" },
  { value: "worcester", label: "Worcester" },
];

export default function AreaSwitch() {
  const { menuArea, setMenuArea } = useUIStore();
  const activeIndex = OPTIONS.findIndex((o) => o.value === menuArea);

  return (
    <div
      role="tablist"
      aria-label="Menu area"
      style={{
        position: "relative",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        padding: 3,
        borderRadius: "var(--radius-full)",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Sliding highlight behind the active option */}
      <span aria-hidden style={{
        position: "absolute", top: 3, bottom: 3, left: 3,
        width: "calc(50% - 3px)",
        borderRadius: "var(--radius-full)",
        background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
        boxShadow: "0 2px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)",
        transform: `translateX(${activeIndex * 100}%)`,
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }} />

      {OPTIONS.map(({ value, label }) => {
        const isActive = value === menuArea;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            onClick={() => setMenuArea(value)}
            style={{
              position: "relative",
              padding: "0.5rem 0",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.85rem", fontWeight: 700,
              color: isActive ? "#fff" : "var(--color-text-2)",
              transition: "color 0.2s",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
