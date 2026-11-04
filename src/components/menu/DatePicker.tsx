/**
 * @file src/components/menu/DatePicker.tsx
 * @description Day strip for moving between days: a 7-day window centred on
 * the selected day. Tapping an edge day moves the window, so there are no
 * arrows. The selected day is a solid tile; today, when it isn't selected,
 * has its number in teal.
 */
import { useDateStore, offsetDate, toLocalDateString } from "@/stores";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** `onPick` runs after a day is chosen, e.g. to close the sheet it's in. */
export default function DatePicker({ onPick }: { onPick?: (date: string) => void } = {}) {
  const { selectedDate, setSelectedDate } = useDateStore();
  const today = toLocalDateString();

  // 3 days before the selected day, the day, and 3 after
  const days = Array.from({ length: 7 }, (_, i) => offsetDate(selectedDate, i - 3));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {days.map((d) => {
        const date       = new Date(`${d}T12:00:00`);
        const isSelected = d === selectedDate;
        const isToday    = d === today;
        return (
          <button
            key={d}
            onClick={() => { setSelectedDate(d); onPick?.(d); }}
            aria-label={`${DAY_NAMES[date.getDay()]} ${date.getDate()}${isToday ? ", today" : ""}`}
            aria-pressed={isSelected}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "0.45rem 0 0.5rem",
              borderRadius: 14, border: "none",
              background: isSelected ? "var(--color-text-1)" : "transparent",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
          >
            <span style={{
              fontSize: "0.68rem", fontWeight: 600,
              color: isSelected ? "var(--color-bg)" : "var(--color-text-3)",
              opacity: isSelected ? 0.6 : 1,
            }}>
              {DAY_LETTERS[date.getDay()]}
            </span>
            <span style={{
              fontSize: "1rem", fontWeight: isSelected || isToday ? 700 : 600,
              color: isSelected ? "var(--color-bg)" : isToday ? "var(--color-primary-light)" : "var(--color-text-2)",
            }}>
              {date.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
