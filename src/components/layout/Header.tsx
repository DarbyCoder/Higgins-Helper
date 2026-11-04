/**
 * @file src/components/layout/Header.tsx
 * @description Top app bar. Left side shows a context-aware greeting/title
 * that changes based on which page the user is on. Right side shows the
 * logging streak as a flame badge, once there is one.
 */
import { useLocation } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUIStore, useUserStore, toLocalDateString } from "@/stores";
import type { MenuArea } from "@/stores/useUIStore";
import { useAuth } from "@/firebase/AuthProvider";
import { FlameIcon } from "@/components/icons";
import { computeStreak } from "@/utils/streak";


const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  menuArea: MenuArea,
  userName?: string
): { subtitle: string; title: string } {
  // Local date: the UTC one is already tomorrow by evening in the US
  const today = toLocalDateString();
  const isToday = selectedDate === today;
  const firstName = userName ? userName.split(" ")[0] : "";
  const greeting = firstName ? `${getTimeGreeting()}, ${firstName}` : getTimeGreeting();

  switch (true) {
    // ── Dashboard ──
    case pathname === "/":
      return {
        subtitle: isToday ? greeting : formatDisplayDate(selectedDate),
        title: isToday ? "Today" : formatDisplayDate(selectedDate),
      };

    // ── Menu (Worcester side) ──
    case pathname === "/menu" && menuArea === "worcester":
      return {
        subtitle: "Worcester",
        title: "Nearby Restaurants",
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

    // ── Profile / Settings ──
    case pathname === "/profile":
      return {
        subtitle: "Your goals & preferences",
        title: "Profile",
      };

    default:
      return {
        subtitle: greeting,
        title: "Higgins Helper",
      };
  }
}

export default function Header() {
  const location = useLocation();
  const selectedDate = useDateStore((s) => s.selectedDate);
  const profileName = useUserStore((s) => s.userProfile?.name);
  const menuArea = useUIStore((s) => s.menuArea);
  const streak = useFoodLogStore((s) => computeStreak(s.foodLog));
  const { user } = useAuth();

  // Prefer the Firebase auth displayName (always current), fall back to stored profile name
  const userName = user?.displayName ?? profileName;

  const { subtitle, title } = getHeaderContent(location.pathname, selectedDate, menuArea, userName);


  return (
    <header style={{
      padding: "1.1rem 1rem 0.75rem",
      maxWidth: 480,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "0.75rem",
    }}>
      <div>
        <div style={{
          fontSize: "0.8rem",
          color: "var(--color-text-2)",
          fontWeight: 500,
        }}>
          {subtitle}
        </div>
        <div style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: "var(--color-text-1)",
          marginTop: 2,
        }}>
          {title}
        </div>
      </div>

      {streak > 0 && (
        <div
          role="img"
          aria-label={`${streak}-day logging streak`}
          title={`${streak}-day logging streak`}
          style={{
            flexShrink: 0, marginBottom: 2,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "0.4rem 0.75rem 0.4rem 0.6rem",
            borderRadius: "var(--radius-full)",
            background: "linear-gradient(180deg, rgba(255,138,76,0.16), rgba(255,138,76,0.08))",
            border: "1px solid rgba(255,138,76,0.25)",
            color: "var(--color-streak)",
            fontSize: "0.875rem", fontWeight: 700,
          }}
        >
          <FlameIcon size={16} />
          {streak}
        </div>
      )}
    </header>
  );
}
