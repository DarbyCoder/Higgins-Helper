/**
 * @file src/components/layout/AppShell.tsx
 * @description Main layout wrapper. Provides the animated background gradient,
 * top header, and bottom navigation bar. All pages are rendered as children.
 * Also renders global toast notifications (#1).
 */
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { useUIStore } from "@/stores/useUIStore";
import { LOCAL_MODE } from "@/firebase/localMode";
import { AlertIcon, BellIcon, CheckIcon, XIcon } from "@/components/icons";

const TOAST_COLOR = { success: "#2CC5A5", error: "#F87171", info: "#9a9ab4" } as const;

interface Props { children: ReactNode; }

export default function AppShell({ children }: Props) {
  const { toasts, dismissToast } = useUIStore();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Ambient background glows */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(20,160,133,0.15) 0%, transparent 70%)",
      }} />
      <div aria-hidden style={{
        position: "fixed", bottom: 0, left: "30%", width: "40%", height: "30%",
        background: "radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* App content */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {isOffline && (
          <div style={{
            background: "#f59e0b", color: "#fff", fontSize: "0.75rem",
            fontWeight: 600, padding: "0.3rem", textAlign: "center",
          }}>
            You are currently offline. Viewing cached data.
          </div>
        )}
        {LOCAL_MODE && (
          <div style={{
            background: "#6366f1", color: "#fff", fontSize: "0.75rem",
            fontWeight: 600, padding: "0.3rem", textAlign: "center",
          }}>
            Local test mode · not signed in · data stays in this browser
          </div>
        )}
        <Header />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </main>
        <BottomNav />
      </div>

      {/* Global toast notifications (#1) */}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed", bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem",
            width: "calc(100% - 2rem)", maxWidth: 420, pointerEvents: "none",
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="animate-slide-up"
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                padding: "0.7rem 0.6rem 0.7rem 0.9rem",
                borderRadius: "var(--radius-lg)",
                // Dark in both themes, like iOS: it floats over the page, not part of it
                background: "rgba(28,28,38,0.96)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 32px rgba(0,0,0,0.35)",
                color: "#f2f2f8", fontSize: "0.85rem", fontWeight: 500,
                pointerEvents: "all",
              }}
            >
              <span aria-hidden style={{ flexShrink: 0, display: "flex", color: TOAST_COLOR[toast.type] }}>
                {toast.type === "success" ? <CheckIcon size={18} strokeWidth={2.4} />
                  : toast.type === "error" ? <AlertIcon size={18} />
                  : <BellIcon size={18} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.run(); dismissToast(toast.id); }}
                  style={{
                    flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                    color: "#2CC5A5", fontSize: "0.85rem", fontWeight: 700, padding: "0.2rem 0.4rem",
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                style={{ flexShrink: 0, display: "flex", background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "0.2rem" }}
              >
                <XIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

