/**
 * @file src/components/layout/Header.tsx
 * @description Top app bar. Left side shows a context-aware greeting/title
 * that changes based on which page the user is on. Right side shows the
 * HigginsHelper "H" logo mark.
 */
import { useLocation } from "react-router-dom";
import { useDateStore, useUserStore } from "@/stores";

const DAY_NAMES   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Returns { subtitle, title } based on the current route path. */
function getHeaderContent(
  pathname: string,
  selectedDate: string,
  userName?: string
): { subtitle: string; title: string } {
  const today     = new Date().toISOString().slice(0, 10);
  const isToday   = selectedDate === today;
  const firstName = userName ? userName.split(" ")[0] : "";
  const greeting  = firstName ? `${getTimeGreeting()}, ${firstName} 👋` : `${getTimeGreeting()} 👋`;

  switch (true) {
    // ── Dashboard ──
    case pathname === "/":
      return {
        subtitle: isToday ? greeting : formatDisplayDate(selectedDate),
        title:    isToday ? "Today" : formatDisplayDate(selectedDate),
      };

    // ── Menu ──
    case pathname === "/menu":
      return {
        subtitle: "Clark Dining",
        title: isToday ? "Today's Menu" : `Menu · ${formatDisplayDate(selectedDate)}`,
      };

    // ── Log ──
    case pathname === "/log":
      return {
        subtitle: isToday ? "Tracking today" : formatDisplayDate(selectedDate),
        title: "Food Log",
      };

    // ── Add food ──
    case pathname === "/add-food":
      return {
        subtitle: "Log anything, anywhere",
        title: "Add Custom Food",
      };

    // ── AI Advisor ──
    case pathname === "/ai":
      return {
        subtitle: "Powered by Gemini",
        title: "AI Nutritionist",
      };

    // ── Profile / Settings ──
    case pathname === "/profile":
      return {
        subtitle: "Your goals & preferences",
        title: "Profile",
      };

    default:
      return {
        subtitle: greeting,
        title: "HigginsHelper",
      };
  }
}

export default function Header() {
  const location     = useLocation();
  const selectedDate = useDateStore((s) => s.selectedDate);
  const userName     = useUserStore((s) => s.userProfile?.name);

  const { subtitle, title } = getHeaderContent(location.pathname, selectedDate, userName);

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
        <div style={{
          fontSize: "0.75rem",
          color: "var(--color-text-3)",
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}>
          {subtitle}
        </div>
        <div style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--color-text-1)",
          marginTop: 2,
        }}>
          {title}
        </div>
      </div>

      {/* Clark U / HigginsHelper logo mark */}
      <div style={{
        width: 38, height: 38,
        borderRadius: "var(--radius-md)",
        background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: "0.9rem", color: "#fff",
        boxShadow: "0 4px 12px rgba(196,30,58,0.4)",
        userSelect: "none",
        flexShrink: 0,
      }}>H</div>
    </header>
  );
}
