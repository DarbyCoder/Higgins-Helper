/**
 * @file src/components/dashboard/MealBreakdown.tsx
 * @description Calories per meal for the selected day: four tiles with line
 * icons. A meal with food in it lights its icon in the calorie colour.
 */
import { useNavigate } from "react-router-dom";
import { AppleIcon, BowlIcon, MoonIcon, SunIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";
import type { LoggedFoodEntry, MealSlot } from "@/types";

const MEALS: { key: MealSlot; label: string; Icon: typeof SunIcon }[] = [
  { key: "breakfast", label: "Breakfast", Icon: SunIcon },
  { key: "lunch",     label: "Lunch",     Icon: BowlIcon },
  { key: "dinner",    label: "Dinner",    Icon: MoonIcon },
  { key: "snack",     label: "Snacks",    Icon: AppleIcon },
];

interface Props { entries: LoggedFoodEntry[]; }

export default function MealBreakdown({ entries }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0.15rem 0.65rem" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em", margin: 0, color: "var(--color-text-1)" }}>
          Meals
        </h2>
        <button
          onClick={() => navigate("/log")}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary-light)" }}
        >
          See log
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        {MEALS.map(({ key, label, Icon }) => {
          const cals = entries.filter((e) => e.mealSlot === key).reduce((a, e) => a + e.calories, 0);
          const has  = cals > 0;
          return (
            <div key={key} className="glass" style={{ padding: "0.75rem 0.3rem 0.7rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
              <Icon size={20} style={{ color: has ? "var(--color-cal)" : "var(--color-text-2)", display: "block", margin: "0 auto" }} />
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-3)", marginTop: 6 }}>
                {label}
              </div>
              <div style={{
                fontSize: "0.95rem", marginTop: 2,
                fontWeight: has ? 700 : 500,
                color: has ? "var(--color-text-1)" : "var(--color-text-3)",
              }}>
                {has ? formatWhole(cals) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
