/**
 * @file src/components/layout/BottomNav.tsx
 * @description Mobile-style bottom navigation bar with animated active indicator.
 * Highlights the active route and uses SVG icons for each tab.
 */
import { NavLink, useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";

const NAV_ITEMS = [
  {
    path: "/", label: "Today",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    path: "/menu", label: "Menu",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18"/>
      </svg>
    ),
  },
  {
    path: "/log", label: "Log",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    path: "/ai", label: "Advisor",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
    ),
  },
  {
    path: "/profile", label: "Profile",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const location = useLocation();
  const wantsAI = useUserStore((s) => s.userProfile?.wantsAIAdvisor ?? true);

  const visibleItems = NAV_ITEMS.filter(item => 
    item.path !== "/ai" || wantsAI
  );

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(11,11,18,0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid var(--color-border)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <div style={{
        display: "flex", alignItems: "stretch",
        maxWidth: 480, margin: "0 auto",
        height: "4rem",
      }}>
        {visibleItems.map(({ path, label, icon }) => {
          const isActive = path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(path);
          return (
            <NavLink key={path} to={path} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3,
              color: isActive ? "var(--color-primary-light)" : "var(--color-text-3)",
              textDecoration: "none",
              transition: "color 0.18s",
              position: "relative",
            }}>
              {/* Active indicator pip */}
              {isActive && (
                <span style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 20, height: 2, borderRadius: 2,
                  background: "var(--color-primary)",
                  boxShadow: "0 0 8px var(--color-primary)",
                }} />
              )}
              {icon(isActive)}
              <span style={{ fontSize: "0.6rem", fontWeight: isActive ? 700 : 500, letterSpacing: "0.04em" }}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
