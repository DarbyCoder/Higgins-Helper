/**
 * @file src/pages/DashboardPage.tsx
 * @description The main "Today" dashboard page. Shows the calorie ring,
 * macro breakdown, meal summary grid, streak, water tracker,
 * weekly chart, dining hours, and a quick-action to the menu.
 */
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore } from "@/stores";
import DailyOverview from "@/components/dashboard/DailyOverview";
import MealBreakdown from "@/components/dashboard/MealBreakdown";
import StreakCounter from "@/components/dashboard/StreakCounter";
import DatePicker from "@/components/menu/DatePicker";

const MOTIVATIONAL_QUOTES = [
  "Every healthy choice is a step toward your goals.",
  "You're fueling your future, one meal at a time.",
  "Consistency beats perfection. Keep going.",
  "Your body, your fuel, your choice.",
  "Small steps every day lead to big changes.",
];

function getDailyQuote(): string {
  const dayIndex = new Date().getDay();
  return MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length]!;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { selectedDate } = useDateStore();
  const { getDailyTotals, getDailyEntries, foodLog } = useFoodLogStore();
  const { macroTargets } = useUserStore();

  const totals  = getDailyTotals(selectedDate);
  const entries = getDailyEntries(selectedDate);
  const pct     = macroTargets.calories > 0 ? totals.calories / macroTargets.calories : 0;

  return (
    <div className="page stagger">
      {/* ── Date navigation strip ── */}
      <div className="mb-2">
        <DatePicker />
      </div>

      {/* ── Streak counter (only shown when active) ── */}
      <div className="mb-3">
        <StreakCounter foodLog={foodLog} />
      </div>

      {/* ── Main calorie card ── */}
      <div className="mb-4">
        <DailyOverview totals={totals} targets={macroTargets} />
      </div>

      {/* ── Meal breakdown grid ── */}
      <div className="mb-4">
        <MealBreakdown entries={entries} />
      </div>

      {/* ── Status message card ── */}
      <div className="glass-2 px-4 py-3 mb-4">
        <div className="text-[0.7rem] text-[var(--color-text-3)] font-semibold tracking-[0.08em] uppercase mb-1">
          💡 Today's Tip
        </div>
        <p className="m-0 text-[0.82rem] text-[var(--color-text-2)] leading-relaxed">
          {pct === 0
            ? "Start logging your first meal to see your progress here."
            : pct < 0.5
            ? `You've hit ${Math.round(pct * 100)}% of your calorie goal. Don't forget to eat!`
            : pct < 0.9
            ? getDailyQuote()
            : pct < 1.05
            ? "Great job — you're right on track with your calorie goal! 🎯"
            : `You've exceeded today's goal by ${Math.round(totals.calories - macroTargets.calories)} cal. Consider lighter options for your next meal.`}
        </p>
      </div>

      {/* ── CTA to menu (when log is empty) ── */}
      {entries.length === 0 && (
        <button
          className="btn-primary w-full justify-center text-[0.9rem] p-3.5"
          onClick={() => navigate("/menu")}
        >
          Browse Today's Menu →
        </button>
      )}

      {/* ── Recent entries preview ── */}
      {entries.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="section-title mb-0">Recent Entries</div>
            <button onClick={() => navigate("/log")} className="bg-transparent border-none text-[0.72rem] text-[var(--color-primary-light)] cursor-pointer font-semibold">
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {entries.slice(-3).reverse().map((entry) => (
              <div key={entry.id} className="flex justify-between items-center py-2 px-3 bg-[var(--color-surface-2)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <span className="text-[0.8rem] text-[var(--color-text-1)] flex-1 min-w-0 truncate">
                  {entry.menuItemName}
                </span>
                <span className="text-[0.8rem] font-bold text-[var(--color-primary-light)] shrink-0 ml-2">
                  {entry.calories} cal
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
