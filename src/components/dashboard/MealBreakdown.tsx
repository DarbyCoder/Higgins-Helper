/**
 * @file src/components/dashboard/MealBreakdown.tsx
 * @description Shows calorie and entry counts per meal slot for the selected day,
 * laid out as a horizontal 4-column grid of mini-cards.
 */
import type { LoggedFoodEntry } from "@/types";

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

const MEALS: { key: MealSlot; label: string; emoji: string; timeHint: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳", timeHint: "Morning" },
  { key: "lunch",     label: "Lunch",     emoji: "🥗", timeHint: "Midday"  },
  { key: "dinner",    label: "Dinner",    emoji: "🍽️", timeHint: "Evening" },
  { key: "snack",     label: "Snacks",    emoji: "🍎", timeHint: "Anytime" },
];

interface Props { entries: LoggedFoodEntry[]; }

export default function MealBreakdown({ entries }: Props) {
  return (
    <div>
      <div className="section-title">Meal Breakdown</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        {MEALS.map(({ key, label, emoji, timeHint }) => {
          const mealEntries = entries.filter((e) => e.mealSlot === key);
          const cals = mealEntries.reduce((a, e) => a + e.calories, 0);
          return (
            <div key={key} className="glass-2" style={{ padding: "0.6rem 0.4rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", lineHeight: 1 }}>{emoji}</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: cals > 0 ? "var(--color-text-1)" : "var(--color-text-3)", marginTop: 4 }}>
                {cals > 0 ? cals.toLocaleString() : "—"}
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--color-text-3)", fontWeight: 500, marginTop: 2 }}>
                {label}
              </div>
              {mealEntries.length > 0 && (
                <div style={{ fontSize: "0.55rem", color: "var(--color-text-3)", marginTop: 1 }}>
                  {mealEntries.length} item{mealEntries.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
