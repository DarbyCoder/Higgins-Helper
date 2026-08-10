/**
 * @file src/components/dashboard/MacroProgressBar.tsx
 * @description An animated progress bar for a single macro nutrient.
 * Shows label, consumed vs target, and color-coded fill with shimmer effect.
 */

interface Props {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color: string;  // CSS color string
}

export default function MacroProgressBar({ label, consumed, target, unit = "g", color }: Props) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isOver = consumed > target;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-2)", textTransform: "capitalize" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isOver ? "#ef4444" : "var(--color-text-1)" }}>
          {consumed.toFixed(label === "Calories" ? 0 : 1)}
          <span style={{ color: "var(--color-text-3)", fontWeight: 400 }}>
            {" "}/{target.toFixed(0)}{unit}
          </span>
        </span>
      </div>
      {/* Track */}
      <div style={{
        height: 7, borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        {/* Fill */}
        <div style={{
          height: "100%",
          width: `${pct * 100}%`,
          borderRadius: 999,
          background: isOver
            ? `linear-gradient(90deg, ${color}, #ef4444)`
            : `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: `0 0 10px ${color}55`,
          transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}
