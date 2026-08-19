/**
 * @file src/pages/LoginPage.tsx
 * @description Walkthrough landing page + login form.
 * Shows a 4-slide intro about the app's features before showing the sign-in form.
 */

import { useState, type FormEvent } from "react";
import { useAuth } from "@/firebase/AuthProvider";

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, error } = useAuth();

  const [step, setStep]                 = useState(0);
  const [mode, setMode]                 = useState<"signin" | "signup">("signin");
  const [name, setName]                 = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError]     = useState<string | null>(null);

  const displayError = localError ?? error;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (mode === "signup" && !name.trim()) {
      setLocalError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, name.trim());
      }
    } catch {
      // error is set inside useAuth via setError; displayed via displayError
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // handled inside useAuth
    } finally {
      setIsSubmitting(false);
    }
  }

  const WALKTHROUGH_SLIDES = [
    {
      emoji: "🥗",
      title: "Welcome to HigginsHelper",
      text: "The ultimate companion for eating smart at Clark University.",
    },
    {
      emoji: "🍽️",
      title: "Live Dining Menus",
      text: "See exactly what's serving at Higgins today, complete with full nutrition facts and ingredients.",
    },
    {
      emoji: "🎯",
      title: "Track Your Macros",
      text: "Log your meals with a single tap and easily hit your daily protein and calorie goals.",
    },
    {
      isAI: true,
      title: "AI Nutritionist",
      text: "Get personalized food advice from our smart assistant, powered by Gemini.",
    },
  ];

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      background: "var(--color-bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide {
          animation: slideUpFade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* Ambient background glows */}
      <div style={{
        position: "absolute", top: "-120px", left: "-80px",
        width: 380, height: 380, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(140,10,10,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", right: "-60px",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(30,50,120,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {step < WALKTHROUGH_SLIDES.length ? (
        <div style={{ zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 400, flex: 1, justifyContent: "center" }}>
          
          <div key={step} className="animate-slide" style={{ textAlign: "center", width: "100%" }}>
            {WALKTHROUGH_SLIDES[step].isAI ? (
              <div style={{
                width: 72, height: 72, borderRadius: "var(--radius-md)", margin: "0 auto 2rem",
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2rem", fontWeight: 800, color: "#fff",
                boxShadow: "0 4px 16px rgba(196, 30, 58, 0.35)"
              }}>AI</div>
            ) : (
              <div style={{ fontSize: "4.5rem", marginBottom: "1.5rem" }}>
                {WALKTHROUGH_SLIDES[step].emoji}
              </div>
            )}
            
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "1rem", color: "var(--color-text-1)" }}>
              {WALKTHROUGH_SLIDES[step].title}
            </h1>
            <p style={{ fontSize: "1.05rem", color: "var(--color-text-2)", lineHeight: 1.5, padding: "0 1rem" }}>
              {WALKTHROUGH_SLIDES[step].text}
            </p>
          </div>

        </div>
      ) : (
        /* The actual Login Form */
        <div className="animate-slide" style={{
          width: "100%", maxWidth: 400,
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl, 1.25rem)",
          padding: "2rem 1.75rem",
          position: "relative", zIndex: 1,
        }}>
          {/* Logo / branding */}
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <img
              src="/logo-square.jpg"
              alt="HigginsHelper"
              style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }}
            />
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>HigginsHelper</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-text-3)" }}>
              Clark University · Nutrition Tracker
            </p>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: "flex", background: "var(--color-surface-2)",
            borderRadius: "var(--radius-full, 9999px)",
            padding: "3px", marginBottom: "1.5rem",
            border: "1px solid var(--color-border)",
          }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setLocalError(null); }}
                style={{
                  flex: 1, padding: "0.45rem 0",
                  borderRadius: "var(--radius-full, 9999px)",
                  border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: "0.82rem",
                  transition: "all 0.18s",
                  background: mode === m ? "var(--color-primary)" : "transparent",
                  color: mode === m ? "#fff" : "var(--color-text-2)",
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginBottom: "0.3rem", display: "block" }}>
                  Name
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginBottom: "0.3rem", display: "block" }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@clarku.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginBottom: "0.3rem", display: "block" }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>

            {displayError && (
              <p style={{
                margin: 0, fontSize: "0.78rem",
                color: "var(--color-danger, #e53935)",
                background: "rgba(229,57,53,0.08)",
                border: "1px solid rgba(229,57,53,0.25)",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 0.75rem",
              }}>
                {displayError}
              </p>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={isSubmitting}
              style={{ marginTop: "0.25rem", opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting
                ? "Please wait…"
                : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            margin: "1.25rem 0",
            color: "var(--color-text-3)", fontSize: "0.75rem",
          }}>
            <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            or
            <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogle}
            disabled={isSubmitting}
            style={{
              width: "100%", padding: "0.65rem 1rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontWeight: 600, fontSize: "0.85rem",
              color: "var(--color-text-1)",
              transition: "all 0.18s",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {/* Google "G" SVG icon */}
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      )}

      {/* Navigation Footer for Walkthrough */}
      {step < WALKTHROUGH_SLIDES.length && (
        <div style={{ width: "100%", maxWidth: 400, marginTop: "auto", zIndex: 1, paddingBottom: "1rem" }}>
          
          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "2.5rem" }}>
            {WALKTHROUGH_SLIDES.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === step ? "var(--color-primary)" : "var(--color-surface-3)",
                transition: "background 0.3s"
              }} />
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={() => setStep(s => s + 1)}
            style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem", borderRadius: "var(--radius-full)" }}
          >
            Continue
          </button>
          
          <button
            className="btn-ghost"
            onClick={() => setStep(WALKTHROUGH_SLIDES.length)}
            style={{
              width: "100%", padding: "0.85rem", marginTop: "0.5rem",
              fontSize: "0.85rem", color: "var(--color-text-3)",
            }}
          >
            Skip to login
          </button>
        </div>
      )}

    </div>
  );
}
