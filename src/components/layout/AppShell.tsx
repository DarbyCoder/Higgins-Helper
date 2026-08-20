/**
 * @file src/components/layout/AppShell.tsx
 * @description Main layout wrapper. Provides the animated background gradient,
 * top header, and bottom navigation bar. All pages are rendered as children.
 * Also renders global toast notifications (#1).
 */
import type { ReactNode } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { useUIStore } from "@/stores/useUIStore";

interface Props { children: ReactNode; }

export default function AppShell({ children }: Props) {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Ambient background glows */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(196,30,58,0.15) 0%, transparent 70%)",
      }} />
      <div aria-hidden style={{
        position: "fixed", bottom: 0, left: "30%", width: "40%", height: "30%",
        background: "radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* App content */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
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
            position: "fixed", bottom: "5.5rem", left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem",
            width: "calc(100% - 2rem)", maxWidth: 420, pointerEvents: "none",
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                background: toast.type === "error"
                  ? "rgba(239,68,68,0.95)"
                  : toast.type === "success"
                  ? "rgba(16,185,129,0.95)"
                  : "rgba(59,130,246,0.95)",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 500,
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
                pointerEvents: "all",
              }}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

