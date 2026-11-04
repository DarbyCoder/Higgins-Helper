/**
 * @file src/components/layout/Header.tsx
 * @description Top app bar. Left side shows a context-aware greeting/title
 * that changes based on which page the user is on. Right side shows the
 * logging streak as a flame badge, once there is one. On the Menu tab the
 * day is a button and the right side holds Search and the Clark / Worcester
 * dropdown instead.
 */
import { useLocation } from "react-router-dom";
import { useDateStore, useFoodLogStore, useUserStore, toLocalDateString } from "@/stores";
import MenuHeaderControls, { MenuDateButton } from "@/components/menu/MenuHeaderControls";
import { useAuth } from "@/firebase/AuthProvider";
import { FlameIcon } from "@/components/icons";
import { computeStreak } from "@/utils/streak";


const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 4", or with the weekday "Thu, Nov 6". */
function formatShortDate(dateStr: string, weekday = false): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const md = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  return weekday ? `${DAY_NAMES[d.getDay()].slice(0, 3)}, ${md}` : md;
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

    // ── Menu: the day is a button (see Header below) ──
    case pathname === "/menu":
      return {
        subtitle: isToday ? `Today, ${formatShortDate(selectedDate)}` : formatShortDate(selectedDate, true),
        title: "Menu",
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

    // ── Scan a Bistro order ──
    case pathname === "/scan-order":
      return {
        subtitle: "From a Grubhub screenshot",
        title: "Scan Bistro Order",
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
  const streak = useFoodLogStore((s) => computeStreak(s.foodLog));
  const { user } = useAuth();

  // Prefer the Firebase auth displayName (always current), fall back to stored profile name
  const userName = user?.displayName ?? profileName;

  const { subtitle, title } = getHeaderContent(location.pathname, selectedDate, userName);
  const onMenu = location.pathname === "/menu";


  return (
    <header style={{
      // Clear the iPhone status bar, which the app draws under (viewport-fit=cover)
      padding: "calc(env(safe-area-inset-top, 0px) + 1.1rem) 1rem 0.75rem",
      maxWidth: 480,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "0.75rem",
      // Above the page, so the Menu's area dropdown can open over it
      position: "relative",
      zIndex: 30,
    }}>
      <div style={{ minWidth: 0 }}>
        {onMenu ? <MenuDateButton label={subtitle} /> : (
          <div style={{
            fontSize: "0.8rem",
            color: "var(--color-text-2)",
            fontWeight: 500,
          }}>
            {subtitle}
          </div>
        )}
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

      {onMenu && <MenuHeaderControls />}

      {!onMenu && streak > 0 && (
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
