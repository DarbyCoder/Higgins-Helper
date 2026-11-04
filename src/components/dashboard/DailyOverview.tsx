/**
 * @file src/components/dashboard/DailyOverview.tsx
 * @description The hero card on Today: the calorie ring with what's left and
 * the goal beside it, then protein, carbs, fat and fiber in a 2×2 grid.
 * Sodium lives on the Log page and the dish sheet, not here.
 */
import CalorieRing from "./CalorieRing";
import MacroProgressBar from "./MacroProgressBar";
import { formatWhole } from "@/utils/format";
import type { MacroTotals, MacroTargets } from "@/types";

interface Props {
  totals: MacroTotals;
  targets: MacroTargets;
}

const MACRO_BARS: Array<{
  key: keyof MacroTotals;
  targetKey: keyof MacroTargets;
  label: string;
  color: string;
}> = [
  { key: "protein",    targetKey: "protein",    label: "Protein", color: "var(--color-protein)" },
  { key: "totalCarbs", targetKey: "totalCarbs", label: "Carbs",   color: "var(--color-carbs)" },
  { key: "totalFat",   targetKey: "totalFat",   label: "Fat",     color: "var(--color-fat)" },
  { key: "fiber",      targetKey: "fiber",      label: "Fiber",   color: "var(--color-fiber)" },
];

export default function DailyOverview({ totals, targets }: Props) {
  const left = targets.calories - totals.calories;

  return (
    <div className="glass" style={{ padding: "1.25rem 1.25rem 1.15rem", borderRadius: "var(--radius-xl)" }}>
      {/* ── Ring + what's left ── */}
      <div data-tour="today-summary" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <CalorieRing consumed={totals.calories} target={targets.calories} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {left >= 0
            ? <Stat label="Remaining" value={formatWhole(left)} />
            : <Stat label="Over" value={formatWhole(-left)} color="var(--color-danger)" />}
          <Stat label="Goal" value={formatWhole(targets.calories)} />
        </div>
      </div>

      {/* ── Macros, 2×2 ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem 1.1rem",
        marginTop: "1.25rem", paddingTop: "1.1rem", borderTop: "1px solid var(--color-border)",
      }}>
        {MACRO_BARS.map(({ key, targetKey, label, color }) => (
          <MacroProgressBar
            key={key}
            label={label}
            consumed={totals[key]}
            target={targets[targetKey] as number}
            color={color}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "var(--color-text-1)" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{
        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
        color: "var(--color-text-3)",
      }}>
        {label}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em", color, lineHeight: 1.25 }}>
        {value}
        <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-2)", marginLeft: 3 }}>cal</span>
      </div>
    </div>
  );
}
