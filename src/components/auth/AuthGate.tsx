/**
 * @file src/components/auth/AuthGate.tsx
 * @description Renders the correct top-level view based on auth state:
 *   • Loading                          → branded splash screen
 *   • Signed out                       → LoginPage
 *   • Signed in, profile still loading → branded splash screen
 *   • Signed in, confirmed no profile  → OnboardingPage (forced wizard)
 *   • Signed in, has profile           → children (the main app)
 */

import type { ReactNode } from "react";
import { useAuth }        from "@/firebase/AuthProvider";
import { useUserStore }   from "@/stores/useUserStore";
import LoginPage          from "@/pages/LoginPage";
import OnboardingPage     from "@/pages/OnboardingPage";

interface AuthGateProps {
  children: ReactNode;
}

/** Branded full-screen splash, shown while auth or the profile is resolving. */
function Splash({ message = "Loading…" }: { message?: string }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--color-bg)", gap: "1rem",
    }}>
      <img
        src="/logo-square.jpg"
        alt="Higgins Helper"
        style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", opacity: 0.9 }}
      />
      <div style={{
        fontSize: "0.82rem", color: "var(--color-text-3)",
        maxWidth: "20rem", textAlign: "center", lineHeight: 1.5,
      }}>
        {message}
      </div>
    </div>
  );
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const hasProfile    = useUserStore((s) => s.userProfile !== null);
  const profileStatus = useUserStore((s) => s.profileStatus);

  // ── 1. Firebase is resolving initial auth state ───────────────────────────
  if (loading) {
    return <Splash />;
  }

  // ── 2. Not authenticated ──────────────────────────────────────────────────
  if (!user) {
    return <LoginPage />;
  }

  // ── 3. Authenticated, but Firestore hasn't answered about the profile yet ─
  // Only blocks when there is no cached profile, so returning users still get
  // the instant paint from localStorage instead of waiting on the network.
  //
  // This check is what keeps a signed-in user with an empty localStorage cache
  // (new device, cleared site data, private window) out of the onboarding
  // wizard — completing it would overwrite the profile they already have.
  if (!hasProfile && profileStatus === "checking") {
    return <Splash message="Loading your profile…" />;
  }

  if (!hasProfile && profileStatus === "error") {
    return <Splash message="Couldn’t load your profile. Check your connection and reload the page." />;
  }

  // ── 4. Authenticated, and Firestore confirmed there is no profile ─────────
  if (!hasProfile) {
    return <OnboardingPage />;
  }

  // ── 5. Fully authenticated with a complete profile ────────────────────────
  return <>{children}</>;
}
