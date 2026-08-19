/**
 * @file src/pages/LogPage.tsx
 * @description Full food log view for the selected date, grouped by meal slot.
 * Allows editing and removing entries, shows daily macro summary, and includes
 * a FAB to add custom foods from outside Higgins dining.
 */
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore } from "@/stores";
import LogEntryRow from "@/components/log/LogEntryRow";

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_ORDER: { key: MealSlot; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳" },
  { key: "lunch",     label: "Lunch",     emoji: "🥗" },
  { key: "dinner",    label: "Dinner",    emoji: "🍽️" },
  { key: "snack",     label: "Snacks",    emoji: "🍎" },
];

export default function LogPage() {
  const navigate = useNavigate();
  const { selectedDate } = useDateStore();
  const { getDailyEntries, getDailyTotals } = useFoodLogStore();
  const { macroTargets } = useUserStore();

  const entries = getDailyEntries(selectedDate);
  const totals  = getDailyTotals(selectedDate);
  const isEmpty = entries.length === 0;

  return (
    <div className="page">

      {/* Daily totals summary */}
      {!isEmpty && (
        <div className="glass" style={{ padding: "0.85rem 1rem", marginBottom: "1rem" }}>
          <div className="section-title">Daily Totals</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {([
              { label: "Calories", val: `${totals.calories}`, target: `/${macroTargets.calories}`, color: "#c41e3a" },
              { label: "Protein",  val: `${totals.protein.toFixed(0)}g`, target: `/${macroTargets.protein}g`, color: "#10b981" },
              { label: "Carbs",    val: `${totals.totalCarbs.toFixed(0)}g`, target: `/${macroTargets.totalCarbs}g`, color: "#3b82f6" },
            ] as const).map(({ label, val, target, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)" }}>{target}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{ textAlign: "center", paddingTop: "2.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📝</div>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-1)" }}>Nothing logged yet</h2>
          <p style={{ margin: "0.4rem 0 1.25rem", color: "var(--color-text-3)", fontSize: "0.85rem" }}>
            Use the buttons below to add your first entry.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => navigate("/menu")}>
              Browse Higgins Menu
            </button>
          </div>
        </div>
      )}

      {/* Grouped by meal */}
      {!isEmpty && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingBottom: "5rem" }}>
          {MEAL_ORDER.map(({ key, label, emoji }) => {
            const mealEntries = entries.filter((e) => e.mealSlot === key);
            if (mealEntries.length === 0) return null;
            const mealCals = mealEntries.reduce((a, e) => a + e.calories, 0);
            return (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>
                    {emoji} {label}
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary-light)" }}>
                    {mealCals} cal
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {mealEntries.map((entry) => (
                    <LogEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FABs ── */}
      <div style={{
        position: "fixed",
        bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
        left: 0, right: 0,
        display: "flex", justifyContent: "space-between",
        padding: "0 1.25rem",
        zIndex: 40,
        maxWidth: 440,
        margin: "0 auto",
      }}>
        {/* Add Water */}
        <button
          className="btn-primary"
          onClick={() => navigate("/add-drink")}
          aria-label="Add water"
          style={{
            background: "#3b82f6", borderColor: "#3b82f6",
            gap: "0.4rem", padding: "0.65rem 1.1rem", fontSize: "0.82rem",
            boxShadow: "0 8px 32px rgba(59,130,246,0.45)",
          }}
        >
          💧 Add Drink
        </button>

        {/* Add Custom Food */}
        <button
          className="btn-primary"
          onClick={() => navigate("/add-food")}
          aria-label="Add custom food"
          style={{
            gap: "0.4rem", padding: "0.65rem 1.1rem", fontSize: "0.82rem",
            boxShadow: "0 8px 32px rgba(196,30,58,0.45)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Custom Food
        </button>
      </div>
    </div>
  );
}
