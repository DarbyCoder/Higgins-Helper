/**
 * @file src/pages/LogPage.tsx
 * @description Full food log view for the selected date, grouped by meal slot.
 * Allows editing and removing entries, shows daily macro summary, and includes
 * a FAB to add custom foods from outside Higgins dining.
 */
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore } from "@/stores";
import LogEntryRow from "@/components/log/LogEntryRow";
import DatePicker from "@/components/menu/DatePicker";

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
  const { getDailyEntries, getDailyTotals, clearDayLog } = useFoodLogStore();
  const { macroTargets } = useUserStore();

  const entries = getDailyEntries(selectedDate);
  const totals  = getDailyTotals(selectedDate);
  const isEmpty = entries.length === 0;

  return (
    <div className="page">
      {/* Page title + clear button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Food Log</h1>
        {!isEmpty && (
          <button
            className="btn-ghost"
            onClick={() => { if (confirm("Clear all entries for this day?")) clearDayLog(selectedDate); }}
            style={{ fontSize: "0.75rem", color: "#f87171", borderColor: "rgba(239,68,68,0.2)" }}
          >
            Clear day
          </button>
        )}
      </div>

      {/* Date strip */}
      <div style={{ marginBottom: "1rem" }}>
        <DatePicker />
      </div>

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
            <button className="btn-ghost" onClick={() => navigate("/add-food")}>
              Custom Food
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
                    {mealCals} kcal
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

      {/* ── FAB: Add custom food ── */}
      <button
        className="btn-primary"
        onClick={() => navigate("/add-food")}
        aria-label="Add custom food"
        style={{
          position: "fixed",
          bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
          right: "calc(50% - 220px + 1rem)",
          // for narrow screens:
          maxWidth: "calc(50% - 24px)",
          gap: "0.4rem",
          padding: "0.65rem 1.1rem",
          fontSize: "0.82rem",
          boxShadow: "0 8px 32px rgba(196,30,58,0.45)",
          zIndex: 40,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Custom Food
      </button>
    </div>
  );
}
