/**
 * @file src/components/menu/DatePicker.tsx
 * @description A swipeable horizontal date strip for navigating between days.
 * Shows a 7-day window centered on the selected date with prev/next arrows.
 * "Today" highlighting respects the active date simulation override.
 */
import { useDateStore, offsetDate } from "@/stores";

function formatDayLabel(dateStr: string): { dow: string; num: string } {
  const d = new Date(`${dateStr}T12:00:00`);
  const dow = ["S","M","T","W","T","F","S"][d.getDay()];
  return { dow: dow ?? "?", num: String(d.getDate()) };
}

export default function DatePicker() {
  const { selectedDate, setSelectedDate, goToNextDay, goToPrevDay, getEffectiveToday } = useDateStore();
  const today = getEffectiveToday(); // respects date simulation

  // Build a 7-day window: 3 before, selected, 3 after
  const days = Array.from({ length: 7 }, (_, i) => offsetDate(selectedDate, i - 3));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
      {/* Prev */}
      <button className="btn-icon" onClick={goToPrevDay} aria-label="Previous day" style={{ flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>

      {/* Day strip — equal-width flex children, no overflow */}
      <div style={{ flex: 1, display: "flex", gap: "0.2rem" }}>
        {days.map((d) => {
          const isSelected = d === selectedDate;
          const isToday = d === today;
          const { dow, num } = formatDayLabel(d);
          return (
            <button key={d} onClick={() => setSelectedDate(d)} style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              padding: "0.4rem 0",
              borderRadius: "var(--radius-md)",
              border: isSelected ? "1px solid var(--color-primary)" : "1px solid transparent",
              background: isSelected
                ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
                : isToday ? "rgba(128,128,180,0.1)" : "transparent",
              cursor: "pointer",
              transition: "all 0.16s",
            }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 600, color: isSelected ? "rgba(255,255,255,0.7)" : "var(--color-text-3)" }}>
                {dow}
              </span>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: isSelected ? "#fff" : isToday ? "var(--color-primary-light)" : "var(--color-text-2)" }}>
                {num}
              </span>
            </button>
          );
        })}
      </div>

      {/* Next */}
      <button className="btn-icon" onClick={goToNextDay} aria-label="Next day" style={{ flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polyline points="9,18 15,12 9,6" />
        </svg>
      </button>
    </div>
  );
}
