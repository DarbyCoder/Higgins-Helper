/**
 * @file src/pages/DashboardPage.tsx
 * @description The "Today" page: the day strip, the calorie ring and macros,
 * calories per meal, and a way into the menu. The streak is the flame badge in
 * the header.
 */
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore } from "@/stores";
import DailyOverview from "@/components/dashboard/DailyOverview";
import MealBreakdown from "@/components/dashboard/MealBreakdown";
import DatePicker from "@/components/menu/DatePicker";
import { BasketIcon, ChevronRightIcon } from "@/components/icons";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { selectedDate } = useDateStore();
  const { getDailyTotals, getDailyEntries } = useFoodLogStore();
  const { macroTargets } = useUserStore();

  const totals  = getDailyTotals(selectedDate);
  const entries = getDailyEntries(selectedDate);

  return (
    <div className="page stagger">
      {/* ── Date navigation strip ── */}
      <div data-tour="date-picker" style={{ marginBottom: "1rem" }}>
        <DatePicker />
      </div>

      {/* ── Calorie ring and macros ── */}
      <div style={{ marginBottom: "1.4rem" }}>
        <DailyOverview totals={totals} targets={macroTargets} />
      </div>

      {/* ── Calories per meal ── */}
      <div style={{ marginBottom: "0.75rem" }}>
        <MealBreakdown entries={entries} />
      </div>

      {/* ── Into the menu ── */}
      <button
        className="glass"
        onClick={() => navigate("/menu")}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.85rem 1rem", borderRadius: "var(--radius-xl)",
          cursor: "pointer", textAlign: "left", color: "var(--color-text-1)",
        }}
      >
        <span aria-hidden style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          display: "grid", placeItems: "center", color: "#fff",
          background: "linear-gradient(135deg, #1CB394, #0A5C4E)",
          boxShadow: "0 4px 14px rgba(20,160,133,0.35)",
        }}>
          <BasketIcon size={19} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 700 }}>Browse today's menu</span>
          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: 1 }}>Higgins and The Bistro</span>
        </span>
        <ChevronRightIcon size={18} style={{ color: "var(--color-text-3)", flexShrink: 0 }} />
      </button>
    </div>
  );
}
