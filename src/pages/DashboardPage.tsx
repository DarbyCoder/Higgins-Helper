/**
 * @file src/pages/DashboardPage.tsx
 * @description The main "Today" dashboard page. Shows the calorie ring,
 * macro breakdown, meal summary grid, date simulation toggle, and a
 * quick-action to the menu.
 */
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore } from "@/stores";
import DailyOverview from "@/components/dashboard/DailyOverview";
import MealBreakdown from "@/components/dashboard/MealBreakdown";
import DatePicker from "@/components/menu/DatePicker";
import DateSimulation from "@/components/dashboard/DateSimulation";

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
  const { getDailyTotals, getDailyEntries } = useFoodLogStore();
  const { macroTargets } = useUserStore();

  const totals  = getDailyTotals(selectedDate);
  const entries = getDailyEntries(selectedDate);
  const pct     = macroTargets.calories > 0 ? totals.calories / macroTargets.calories : 0;

  return (
    <div className="page stagger">
      {/* ── Date navigation strip ── */}
      <div style={{ marginBottom: "0.6rem" }}>
        <DatePicker />
      </div>

      {/* ── Date Simulation Toggle ── */}
      <div style={{ marginBottom: "1rem" }}>
        <DateSimulation />
      </div>

      {/* ── Main calorie card ── */}
      <div style={{ marginBottom: "1rem" }}>
        <DailyOverview totals={totals} targets={macroTargets} />
      </div>

      {/* ── Meal breakdown grid ── */}
      <div style={{ marginBottom: "1rem" }}>
        <MealBreakdown entries={entries} />
      </div>

      {/* ── Status message card ── */}
      <div className="glass-2" style={{ padding: "0.85rem 1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-3)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
          💡 Today's Tip
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
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
          className="btn-primary"
          onClick={() => navigate("/menu")}
          style={{ width: "100%", justifyContent: "center", fontSize: "0.9rem", padding: "0.9rem" }}
        >
          Browse Today's Menu →
        </button>
      )}

      {/* ── Recent entries preview ── */}
      {entries.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Recent Entries</div>
            <button onClick={() => navigate("/log")} style={{ background: "none", border: "none", fontSize: "0.72rem", color: "var(--color-primary-light)", cursor: "pointer", fontWeight: 600 }}>
              View all →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {entries.slice(-3).reverse().map((entry) => (
              <div key={entry.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.55rem 0.75rem",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-1)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.menuItemName}
                </span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-primary-light)", flexShrink: 0, marginLeft: "0.5rem" }}>
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
