/**
 * @file src/components/menu/BudgetCard.tsx
 * @description Top of the Menu tab: calories left for the day, whether the
 * meal being browsed is logged yet, and protein/carbs/fat/fiber left.
 */
import type { LoggedFoodEntry, MacroTargets, MacroTotals, MealSlot } from "@/types";
import { formatWhole } from "@/utils/format";

interface Props {
  totals: MacroTotals;
  targets: MacroTargets;
  entries: LoggedFoodEntry[];
  /** The slot of the meal being browsed, for "Dinner not logged". */
  slot: MealSlot | null;
  /** "today", or the day being browsed, e.g. "Thu, Nov 6". */
  dayLabel: string;
}

const SLOT_NAMES: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

const MACROS = [
  { key: "protein",    label: "Protein", color: "var(--color-protein)" },
  { key: "totalCarbs", label: "Carbs",   color: "var(--color-carbs)" },
  { key: "totalFat",   label: "Fat",     color: "var(--color-fat)" },
  { key: "fiber",      label: "Fiber",   color: "var(--color-fiber)" },
] as const;

export default function BudgetCard({ totals, targets, entries, slot, dayLabel }: Props) {
  const left = Math.round(targets.calories - totals.calories);
  const over = left < 0;
  const eatenPct = targets.calories > 0 ? Math.min(1, totals.calories / targets.calories) : 0;

  const slotCal = slot ? entries.filter((e) => e.mealSlot === slot).reduce((a, e) => a + e.calories, 0) : 0;
  const slotLogged = slot && entries.some((e) => e.mealSlot === slot);
  const mealNote = !slot ? "" : slotLogged ? `${SLOT_NAMES[slot]} · ${formatWhole(slotCal)} cal logged` : `${SLOT_NAMES[slot]} not logged`;

  return (
    <div className="glass" style={{ padding: "1rem 1rem 0.95rem" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-2)" }}>
        {over ? "Over" : "Left"} {dayLabel}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginTop: 4 }}>
        <span style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: over ? "var(--color-danger)" : "var(--color-text-1)" }}>
          {formatWhole(Math.abs(left))}
        </span>
        <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-2)" }}>cal</span>
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", fontWeight: 500, color: "var(--color-text-2)", textAlign: "right" }}>{mealNote}</span>
      </div>

      <div role="progressbar" aria-label="Calories eaten" aria-valuenow={Math.round(eatenPct * 100)} aria-valuemin={0} aria-valuemax={100}
        style={{ height: 6, borderRadius: 99, background: "var(--color-track)", margin: "0.8rem 0 0.85rem", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${eatenPct * 100}%`, borderRadius: 99,
          background: over ? "var(--color-danger)" : "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))",
          transition: "width 0.6s cubic-bezier(0.2,0.9,0.25,1)",
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
        {MACROS.map(({ key, label, color }) => {
          const g = Math.round(targets[key] - totals[key]);
          return (
            <div key={key} style={{ fontSize: "0.72rem", color: "var(--color-text-2)", minWidth: 0 }}>
              <span aria-hidden style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, marginRight: 5, position: "relative", top: -1 }} />
              {label}
              <div style={{ fontSize: "1rem", fontWeight: 750, color: "var(--color-text-1)", marginTop: 2, whiteSpace: "nowrap" }}>
                {formatWhole(Math.abs(g))}g{" "}
                <span className={g < 0 ? undefined : "menu-left-word"} style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--color-text-3)" }}>{g < 0 ? "over" : "left"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
