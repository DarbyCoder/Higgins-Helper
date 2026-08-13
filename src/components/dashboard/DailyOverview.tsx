/**
 * @file src/components/dashboard/DailyOverview.tsx
 * @description The main dashboard card showing the calorie ring, macro progress bars,
 * and a quick-stats row. This is the hero component of the dashboard.
 */
import CalorieRing from "./CalorieRing";
import MacroProgressBar from "./MacroProgressBar";
import type { MacroTotals, MacroTargets } from "@/types";

interface Props {
  totals: MacroTotals;
  targets: MacroTargets;
}

const MACRO_BARS: Array<{
  key: keyof MacroTotals;
  targetKey: keyof MacroTargets;
  label: string;
  unit: string;
  color: string;
}> = [
  { key: "protein",   targetKey: "protein",   label: "Protein",   unit: "g",  color: "#10b981" },
  { key: "totalCarbs",targetKey: "totalCarbs", label: "Carbs",     unit: "g",  color: "#3b82f6" },
  { key: "totalFat",  targetKey: "totalFat",   label: "Fat",       unit: "g",  color: "#f59e0b" },
  { key: "fiber",     targetKey: "fiber",      label: "Fiber",     unit: "g",  color: "#8b5cf6" },
];

export default function DailyOverview({ totals, targets }: Props) {
  return (
    <div className="glass" style={{ padding: "1.25rem" }}>
      {/* ── Top: Ring + quick stats ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.25rem" }}>
        <CalorieRing consumed={totals.calories} target={targets.calories} size={150} thickness={18} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <QuickStat label="Goal" value={targets.calories.toLocaleString()} unit="cal" color="var(--color-text-3)" />
          <QuickStat label="Burned" value="—" unit="cal" color="var(--color-text-3)" />
          <div style={{ height: 1, background: "var(--color-border)" }} />
          <QuickStat
            label="Net"
            value={(targets.calories - totals.calories).toLocaleString()}
            unit="cal"
            color={totals.calories > targets.calories ? "#ef4444" : "#10b981"}
          />
        </div>
      </div>

      {/* ── Bottom: Macro bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {MACRO_BARS.map(({ key, targetKey, label, unit, color }) => (
          <MacroProgressBar
            key={key}
            label={label}
            consumed={totals[key]}
            target={targets[targetKey] as number}
            unit={unit}
            color={color}
          />
        ))}
      </div>

      {/* ── Sodium note ── */}
      <div style={{
        marginTop: "0.85rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "var(--radius-sm)",
        background: "rgba(255,255,255,0.03)",
        display: "flex", justifyContent: "space-between",
        fontSize: "0.75rem",
      }}>
        <span style={{ color: "var(--color-text-3)" }}>Sodium</span>
        <span style={{
          fontWeight: 600,
          color: totals.sodium > targets.sodium ? "#ef4444" : "var(--color-text-2)"
        }}>
          {Math.round(totals.sodium).toLocaleString()} / {targets.sodium.toLocaleString()} mg
        </span>
      </div>
    </div>
  );
}

function QuickStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.72rem", color: "var(--color-text-3)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>
        {value} <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--color-text-3)" }}>{unit}</span>
      </span>
    </div>
  );
}
