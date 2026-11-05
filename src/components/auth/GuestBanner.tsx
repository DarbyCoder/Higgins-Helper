/**
 * @file src/components/auth/GuestBanner.tsx
 * @description The floating pill shown all through guest mode: nothing is
 * being saved, with a way to make an account. It sits in space the header and
 * onboarding leave for it (--guest-banner-h), so it never covers them.
 */
import { useLayoutEffect } from "react";
import { leaveGuestMode } from "@/firebase/guestMode";

const HEIGHT = 44; // the pill plus the gap under it

export default function GuestBanner() {
  // Make room at the top of the header and onboarding while it's showing
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--guest-banner-h", `${HEIGHT}px`);
    return () => { root.removeProperty("--guest-banner-h"); };
  }, []);

  return (
    <div
      role="status"
      style={{
        position: "fixed", zIndex: 150, left: "50%", transform: "translateX(-50%)",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        width: "max-content", maxWidth: "calc(100% - 32px)",
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.3rem 0.3rem 0.3rem 0.85rem", borderRadius: "var(--radius-full)",
        background: "color-mix(in srgb, var(--color-surface-2) 88%, transparent)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        border: "1px solid var(--color-border-2)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        animation: "fade-in 0.3s ease",
      }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-streak)", flexShrink: 0 }} />
      <span style={{ fontSize: "0.78rem", color: "var(--color-text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <b style={{ fontWeight: 700 }}>Guest mode</b>
        <span style={{ color: "var(--color-text-2)" }}> · Nothing is saved</span>
      </span>
      <button
        onClick={() => leaveGuestMode("signup")}
        className="pressable"
        style={{
          flexShrink: 0, height: 28, padding: "0 0.8rem", border: "none", cursor: "pointer",
          borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, color: "#fff",
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
        }}
      >
        Sign up
      </button>
    </div>
  );
}
