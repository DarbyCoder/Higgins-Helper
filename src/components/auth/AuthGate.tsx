/**
 * @file src/components/auth/AuthGate.tsx
 * @description Renders the correct top-level view based on auth state:
 *   • Loading   → branded splash screen
 *   • Signed out → LoginPage
 *   • Signed in, no profile → OnboardingPage (forced wizard)
 *   • Signed in, has profile → children (the main app)
 */

import type { ReactNode } from "react";
import { useAuth }        from "@/firebase/AuthProvider";
import { useUserStore }   from "@/stores/useUserStore";
import LoginPage          from "@/pages/LoginPage";
import OnboardingPage     from "@/pages/OnboardingPage";

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading }       = useAuth();
  const hasProfile = useUserStore((s) => s.userProfile !== null);

  // ── 1. Firebase is resolving initial auth state ───────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "var(--color-bg)", gap: "1rem",
      }}>
        <img
          src="/logo-square.jpg"
          alt="HigginsHelper"
          style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", opacity: 0.9 }}
        />
        <div style={{ fontSize: "0.82rem", color: "var(--color-text-3)" }}>Loading…</div>
      </div>
    );
  }

  // ── 2. Not authenticated ──────────────────────────────────────────────────
  if (!user) {
    return <LoginPage />;
  }

  // ── 3. Authenticated but profile not yet set up ───────────────────────────
  if (!hasProfile) {
    return <OnboardingPage />;
  }

  // ── 4. Fully authenticated with a complete profile ────────────────────────
  return <>{children}</>;
}
