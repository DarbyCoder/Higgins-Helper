/**
 * @file src/components/layout/Header.tsx
 * @description Top app bar showing the current date, a greeting, and a notification icon.
 */
import { useDateStore } from "@/stores";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  const selectedDate = useDateStore((s) => s.selectedDate);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === today;

  return (
    <header style={{
      padding: "1rem 1rem 0.5rem",
      maxWidth: 480,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 500, letterSpacing: "0.04em" }}>
          {isToday ? `${getGreeting()} 👋` : formatDisplayDate(selectedDate)}
        </div>
        <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-1)", marginTop: 2 }}>
          {isToday ? "Today" : formatDisplayDate(selectedDate)}
        </div>
      </div>
      {/* Clark U logo mark */}
      <div style={{
        width: 38, height: 38, borderRadius: "var(--radius-md)",
        background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: "0.9rem", color: "#fff",
        boxShadow: "0 4px 12px rgba(196,30,58,0.4)",
        userSelect: "none",
      }}>H</div>
    </header>
  );
}
