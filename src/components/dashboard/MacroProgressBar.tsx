/**
 * @file src/components/dashboard/MacroProgressBar.tsx
 * @description One nutrient's progress: a colour dot and name, "eaten / goal"
 * in whole grams, and a thin bar in the nutrient's colour. Over the goal, the
 * number turns red.
 */
import { formatWhole } from "@/utils/format";

interface Props {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  /** The nutrient's colour, e.g. var(--color-protein). */
  color: string;
}

export default function MacroProgressBar({ label, consumed, target, unit = "g", color }: Props) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isOver = consumed > target;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6, marginBottom: 7 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-2)" }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
          {label}
        </span>
        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: isOver ? "var(--color-danger)" : "var(--color-text-1)", whiteSpace: "nowrap" }}>
          {formatWhole(consumed)}
          <span style={{ color: "var(--color-text-3)", fontWeight: 500, fontSize: "0.75rem" }}>
            {" "}/ {formatWhole(target)}{unit}
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(consumed)}
        aria-valuemax={Math.round(target)}
        style={{ height: 6, borderRadius: 999, background: "var(--color-track)", overflow: "hidden" }}
      >
        <div style={{
          height: "100%",
          width: `${pct * 100}%`,
          borderRadius: 999,
          background: color,
          transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}
