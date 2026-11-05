/**
 * @file src/components/menu/MealBar.tsx
 * @description Under the tabs: "Open · Dinner 5:00 – 8:00 PM" and a meal
 * button that opens a picker of the day's meals.
 */
import { useState } from "react";
import type { DiningLocation, MealPeriod } from "@/types";
import Sheet from "@/components/ui/Sheet";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { findActiveMealPeriod, parseTimeToMinutes } from "@/utils/time";
import { mealLabel } from "@/utils/menuHelpers";

interface Props {
  location: DiningLocation;
  meal: MealPeriod;
  isToday: boolean;
  onMeal: (name: string) => void;
}

/** "5:00 pm" → "5:00 PM" */
const time = (t: string) => t.replace(/\s*(am|pm)$/i, (_, m: string) => ` ${m.toUpperCase()}`);

/** "5:00 – 8:00 PM", or "11:00 AM – 11:00 PM" across noon. */
function hoursOf(meal: MealPeriod): string {
  if (!meal.startTime || !meal.endTime) return "";
  const a = time(meal.startTime), b = time(meal.endTime);
  const sa = a.slice(-2), sb = b.slice(-2);
  return sa === sb ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/** Whether the meal is on now, later today, or over; null for another day. */
function mealState(meal: MealPeriod, isToday: boolean): { word: string; color: string } | null {
  if (!isToday) return null;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(meal.startTime);
  const end = parseTimeToMinutes(meal.endTime);
  if (start === null || end === null) return null;
  if (mins >= start && mins < end) return { word: "Open", color: "var(--color-primary-light)" };
  if (mins < start) return { word: "Later", color: "var(--color-carbs)" };
  return { word: "Ended", color: "var(--color-text-3)" };
}

export default function MealBar({ location, meal, isToday, onMeal }: Props) {
  const [picking, setPicking] = useState(false);
  const state = mealState(meal, isToday);
  const now = isToday ? findActiveMealPeriod(location.meals)?.name : undefined;
  const hours = hoursOf(meal);
  const many = location.meals.length > 1;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <p style={{ margin: 0, minWidth: 0, fontSize: "0.85rem", color: "var(--color-text-2)", lineHeight: 1.4 }}>
          {state && <><b style={{ color: state.color, fontWeight: 700 }}>{state.word}</b>{" · "}</>}
          {meal.name}{hours && ` ${hours}`}
        </p>
        <button
          className="pressable"
          onClick={() => many && setPicking(true)}
          aria-haspopup={many ? "dialog" : undefined}
          aria-label={`${mealLabel(meal.name)}${many ? ". Change meal" : ""}`}
          style={{
            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, height: 40,
            padding: many ? "0 0.8rem 0 1rem" : "0 1rem", borderRadius: "var(--radius-full)",
            background: "var(--color-primary-ghost)", border: "1px solid var(--color-primary)",
            color: "var(--color-primary-light)", fontSize: "0.9rem", fontWeight: 700,
            cursor: many ? "pointer" : "default",
          }}
        >
          {mealLabel(meal.name)}
          {many && <ChevronDownIcon size={14} strokeWidth={2.6} />}
        </button>
      </div>

      {picking && (
        <Sheet title={`${location.name.replace(/^the table at /i, "")} meals`} onClose={() => setPicking(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: "0.5rem" }}>
            {location.meals.map((m) => {
              const selected = m.name === meal.name;
              return (
                <button
                  key={m.name}
                  className="pressable"
                  onClick={() => { onMeal(m.name); setPicking(false); }}
                  aria-pressed={selected}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.85rem 1rem", borderRadius: "var(--radius-lg)", cursor: "pointer", textAlign: "left",
                    background: selected ? "var(--color-primary-ghost)" : "var(--color-surface-2)",
                    border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                    color: "var(--color-text-1)",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "0.95rem" }}>
                      {m.name}
                      {m.name === now && (
                        <span style={{ marginLeft: 8, fontSize: "0.68rem", fontWeight: 700, color: "var(--color-primary-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Now</span>
                      )}
                    </span>
                    {m.startTime && m.endTime && (
                      <span style={{ display: "block", marginTop: 2, fontSize: "0.78rem", color: "var(--color-text-2)" }}>{hoursOf(m)}</span>
                    )}
                  </span>
                  {selected && <CheckIcon size={18} strokeWidth={2.4} style={{ color: "var(--color-primary-light)" }} />}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}
