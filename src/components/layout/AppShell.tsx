/**
 * @file src/components/layout/AppShell.tsx
 * @description Main layout wrapper. Provides the animated background gradient,
 * top header, and bottom navigation bar. All pages are rendered as children.
 */
import type { ReactNode } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";

interface Props { children: ReactNode; }

export default function AppShell({ children }: Props) {
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
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
