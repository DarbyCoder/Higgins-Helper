/**
 * @file src/pages/LogPage.tsx
 * @description Full food log view for the selected date, grouped by meal slot.
 * Allows editing and removing entries, shows daily macro summary, and includes
 * FABs to log a Bistro order from a screenshot and to add custom foods from
 * outside Higgins dining.
 */
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore } from "@/stores";
import LogEntryRow from "@/components/log/LogEntryRow";
import { AppleIcon, BowlIcon, CameraIcon, MoonIcon, NotebookIcon, PlusIcon, SunIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";
import type { MealSlot } from "@/types";

const MEAL_ORDER: { key: MealSlot; label: string; Icon: typeof SunIcon }[] = [
  { key: "breakfast", label: "Breakfast", Icon: SunIcon },
  { key: "lunch",     label: "Lunch",     Icon: BowlIcon },
  { key: "dinner",    label: "Dinner",    Icon: MoonIcon },
  { key: "snack",     label: "Snacks",    Icon: AppleIcon },
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

      {/* Daily totals: everything, including the fiber and sodium Today leaves out */}
      {!isEmpty && (
        <div className="glass" style={{ padding: "1rem 1.1rem", marginBottom: "1.4rem", borderRadius: "var(--radius-xl)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.9rem 0.5rem" }}>
            {([
              // `limit`: a ceiling, so going over shows in red. Over on protein or fiber is fine.
              { label: "Calories", val: totals.calories,   target: macroTargets.calories,   unit: "",   color: "var(--color-cal)",     limit: true },
              { label: "Protein",  val: totals.protein,    target: macroTargets.protein,    unit: "g",  color: "var(--color-protein)", limit: false },
              { label: "Carbs",    val: totals.totalCarbs, target: macroTargets.totalCarbs, unit: "g",  color: "var(--color-carbs)",   limit: false },
              { label: "Fat",      val: totals.totalFat,   target: macroTargets.totalFat,   unit: "g",  color: "var(--color-fat)",     limit: false },
              { label: "Fiber",    val: totals.fiber,      target: macroTargets.fiber,      unit: "g",  color: "var(--color-fiber)",   limit: false },
              { label: "Sodium",   val: totals.sodium,     target: macroTargets.sodium,     unit: "mg", color: "var(--color-sodium)",  limit: true },
            ]).map(({ label, val, target, unit, color, limit }) => (
              <div key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-3)" }}>
                  <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  {label}
                </div>
                <div style={{ marginTop: 3, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.01em", color: limit && val > target ? "var(--color-danger)" : "var(--color-text-1)" }}>
                    {formatWhole(val)}
                  </span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--color-text-3)" }}>
                    {" "}/ {formatWhole(target)}{unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{ textAlign: "center", paddingTop: "2.5rem" }}>
          <div aria-hidden style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 1rem",
            display: "grid", placeItems: "center",
            background: "var(--color-primary-ghost)", color: "var(--color-primary-light)",
          }}>
            <NotebookIcon size={30} />
          </div>
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
          {MEAL_ORDER.map(({ key, label, Icon }) => {
            const mealEntries = entries.filter((e) => e.mealSlot === key);
            if (mealEntries.length === 0) return null;
            const mealCals = mealEntries.reduce((a, e) => a + e.calories, 0);
            return (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 7, margin: 0, fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-text-1)" }}>
                    <Icon size={18} style={{ color: "var(--color-cal)" }} />
                    {label}
                  </h2>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-2)" }}>
                    {formatWhole(mealCals)} cal
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
      <div data-tour="log-actions" style={{
        position: "fixed",
        bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
        left: 0, right: 0,
        display: "flex", justifyContent: "space-between",
        padding: "0 1.25rem",
        zIndex: 40,
        maxWidth: 440,
        margin: "0 auto",
      }}>
        {/* Scan Bistro Order: the secondary action, so it doesn't compete with Add */}
        <button
          onClick={() => navigate("/scan-order")}
          aria-label="Log a Bistro order from a screenshot"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            padding: "0.65rem 1.1rem", fontSize: "0.82rem", fontWeight: 600,
            borderRadius: "var(--radius-full)", cursor: "pointer",
            color: "var(--color-text-1)",
            background: "color-mix(in srgb, var(--color-surface-2) 88%, transparent)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--color-border-2)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.3)",
          }}
        >
          <CameraIcon size={16} style={{ color: "var(--color-primary-light)" }} />
          Scan Bistro Order
        </button>

        {/* Add Custom Food */}
        <button
          className="btn-primary"
          onClick={() => navigate("/add-food")}
          aria-label="Add custom food"
          style={{
            gap: "0.4rem", padding: "0.65rem 1.1rem", fontSize: "0.82rem",
            boxShadow: "0 8px 32px rgba(20,160,133,0.45)",
          }}
        >
          <PlusIcon size={15} strokeWidth={2.4} />
          Add Custom Food
        </button>
      </div>
    </div>
  );
}
