/**
 * @file src/components/auth/AuthGate.tsx
 * @description Renders the correct top-level view based on auth state:
 *   • Loading                          → branded splash screen
 *   • Signed out                       → LoginPage
 *   • Signed in, profile still loading → branded splash screen
 *   • Signed in, log not on this device yet → branded splash screen
 *   • Signed in, confirmed no profile  → OnboardingPage (forced wizard)
 *   • Signed in, has profile           → children (the main app)
 *
 * In local test mode (`npm run dev:local`) sign-in is skipped entirely: no
 * saved profile → OnboardingPage, otherwise the main app. The profile comes
 * from this browser's localStorage only.
 */

import { lazy, Suspense, type ReactNode } from "react";
import { useAuth }        from "@/firebase/AuthProvider";
import { LOCAL_MODE }     from "@/firebase/localMode";
import { useUserStore }   from "@/stores/useUserStore";
import { useFoodLogStore } from "@/stores/useFoodLogStore";
// Only signed-out and brand-new users see these, so everyone else never downloads them
const LoginPage      = lazy(() => import("@/pages/LoginPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Full-screen splash while auth or the profile is resolving. The icon sits
 * exactly where the HTML splash in index.html and the iPhone launch screens
 * put it, so the hand-off doesn't jump. A message, if any, goes below it
 * without moving it.
 */
function Splash({ message }: { message?: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "var(--color-bg)" }}>
      <img
        src="/icon.svg"
        alt="Higgins Helper"
        style={{ width: 104, height: 104, borderRadius: "24%", boxShadow: "0 12px 40px rgba(20,160,133,0.28)" }}
      />
      {message && (
        <div style={{
          position: "absolute", top: "calc(50% + 76px)", left: 0, right: 0, padding: "0 2rem",
          fontSize: "0.82rem", color: "var(--color-text-3)", textAlign: "center", lineHeight: 1.5,
          animation: "fade-in 0.4s ease 0.6s both",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default function AuthGate({ children }: AuthGateProps) {
  return (
    <Suspense fallback={<Splash />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

function Gate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const hasProfile    = useUserStore((s) => s.userProfile !== null);
  const profileStatus = useUserStore((s) => s.profileStatus);
  const logIsSynced   = useFoodLogStore((s) => s.logSync?.uid === user?.uid);
  const hasCachedLog  = useFoodLogStore((s) => Object.keys(s.foodLog).length > 0);

  // ── 0. Local test mode: no sign-in, no Firestore ──────────────────────────
  if (LOCAL_MODE) {
    return hasProfile ? <>{children}</> : <OnboardingPage />;
  }

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

  // ── 4. This device doesn't hold this user's log yet ───────────────────────
  // Unlike the instant paint above, this has to wait. A cached profile can get
  // here with an empty log (account switch), and an entry added to a day that
  // only looks empty would overwrite that day's real doc when it saves.
  //
  // If the sync failed, a cache with no recorded owner still opens: it predates
  // owner tracking, and it's all someone offline has to look at.
  if (!logIsSynced && profileStatus !== "error") {
    return <Splash message="Loading your food log…" />;
  }

  if (!logIsSynced && !hasCachedLog) {
    return <Splash message="Couldn’t load your food log. Check your connection and reload the page." />;
  }

  // ── 5. Authenticated, and Firestore confirmed there is no profile ─────────
  if (!hasProfile) {
    return <OnboardingPage />;
  }

  // ── 6. Fully authenticated with a complete profile ────────────────────────
  return <>{children}</>;
}
