/**
 * @file src/components/dashboard/DiningHoursWidget.tsx
 * @description Shows current Higgins dining hall open/closed status
 * and today's meal periods with their times.
 * Fetches from the same /api/menu endpoint the MenuPage uses.
 */
import { useEffect } from "react";
import { useDateStore, useMenuStore } from "@/stores";

function formatTime(t: string): string {
  // Convert "HH:MM" or "H:MM am/pm" to clean display
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function isCurrentlyOpen(startTime: string, endTime: string): boolean {
  const now = new Date();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return false;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return nowMins >= startMins && nowMins < endMins;
}

export default function DiningHoursWidget() {
  const { selectedDate } = useDateStore();
  const { menuData, fetchMenu } = useMenuStore();

  useEffect(() => {
    fetchMenu(selectedDate);
  }, [selectedDate, fetchMenu]);

  if (!menuData) return null;

  const higginsLocation = menuData.locations.find((l) =>
    l.name.toLowerCase().includes("higgins") || l.name.toLowerCase().includes("table")
  );

  if (!higginsLocation) return null;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const isToday = selectedDate === todayKey;

  // Find the currently open or next upcoming meal
  const currentMeal = higginsLocation.meals.find((m) =>
    isCurrentlyOpen(m.startTime, m.endTime)
  );
  const nextMeal = !currentMeal
    ? higginsLocation.meals.find((m) => {
        const [h, min] = m.startTime.split(":").map(Number);
        if (isNaN(h)) return false;
        return h * 60 + min > now.getHours() * 60 + now.getMinutes();
      })
    : undefined;

  const isOpen = !!currentMeal;

  return (
    <div className="glass-2" style={{ padding: "0.85rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "1rem" }}>🏛️</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-1)" }}>
            {higginsLocation.name}
          </span>
        </div>
        {isToday && (
          <div style={{
            fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            background: isOpen ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
            color: isOpen ? "#10b981" : "#f87171",
            border: `1px solid ${isOpen ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`,
          }}>
            {isOpen ? "● Open" : "● Closed"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {higginsLocation.meals.map((meal) => {
          const active = isToday && isCurrentlyOpen(meal.startTime, meal.endTime);
          return (
            <div key={meal.name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: "0.72rem",
              color: active ? "var(--color-text-1)" : "var(--color-text-3)",
              fontWeight: active ? 700 : 400,
              padding: "2px 0",
            }}>
              <span>{meal.name}</span>
              <span>{formatTime(meal.startTime)} – {formatTime(meal.endTime)}</span>
            </div>
          );
        })}
      </div>

      {isToday && currentMeal && (
        <div style={{ fontSize: "0.68rem", color: "#10b981", marginTop: "0.5rem", fontWeight: 600 }}>
          {currentMeal.name} closes at {formatTime(currentMeal.endTime)}
        </div>
      )}
      {isToday && nextMeal && !currentMeal && (
        <div style={{ fontSize: "0.68rem", color: "#f59e0b", marginTop: "0.5rem", fontWeight: 600 }}>
          Next: {nextMeal.name} opens at {formatTime(nextMeal.startTime)}
        </div>
      )}
    </div>
  );
}
