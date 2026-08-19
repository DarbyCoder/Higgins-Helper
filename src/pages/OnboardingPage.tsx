/**
 * @file src/pages/OnboardingPage.tsx
 * @description Deepstash-style one-question-per-screen profile setup wizard.
 * 8 total steps with smooth transitions and large tap targets.
 */

import { useState } from "react";
import { useUserStore } from "@/stores/useUserStore";
import { useAuth } from "@/firebase/AuthProvider";
import type { UserProfile, ActivityLevel, WeightGoal } from "@/types";

const TOTAL_STEPS = 9;

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentary",   label: "Sedentary",    description: "Mostly sitting — desk job, classes, little to no intentional exercise" },
  { value: "light",       label: "Lightly Active", description: "Light walks, casual movement, or 1–2 gym sessions per week" },
  { value: "moderate",    label: "Moderately Active", description: "3–4 workouts per week — gym, jogging, intramural sports" },
  { value: "active",      label: "Very Active",  description: "Intense training 5–6 days/week — athlete, frequent cardio & lifting" },
  { value: "very_active", label: "Extremely Active", description: "Physical job or 2-a-day training — construction, varsity sports, military" },
];

const GOAL_OPTIONS: { value: WeightGoal; label: string; emoji: string }[] = [
  { value: "lose",     label: "Lose Weight",    emoji: "📉" },
  { value: "maintain", label: "Maintain Weight", emoji: "⚖️" },
  { value: "gain",     label: "Gain Muscle",    emoji: "💪" },
];

const DIETARY_OPTIONS = ["Vegan", "Vegetarian", "Gluten-Free", "Halal", "Kosher"];

export default function OnboardingPage() {
  const { user } = useAuth();
  const setUserProfile = useUserStore((s) => s.setUserProfile);

  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name,         setName]         = useState(user?.displayName ?? "");
  const [age,          setAge]          = useState("");
  const [sex,          setSex]          = useState<"male" | "female" | "other" | null>(null);
  const [weight,       setWeight]       = useState("");
  const [weightUnit,   setWeightUnit]   = useState<"lbs" | "kg">("lbs");
  const [height,       setHeight]       = useState("");
  const [heightUnit,   setHeightUnit]   = useState<"in" | "cm">("in");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal,         setGoal]         = useState<WeightGoal | null>(null);
  const [dietary,      setDietary]      = useState<string[]>([]);
  const [wantsAI,      setWantsAI]      = useState(true);

  function toggleDietary(pref: string) {
    setDietary((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return !!age && Number(age) > 0 && Number(age) < 120;
      case 3: return sex !== null;
      case 4: return !!weight && Number(weight) > 0;
      case 5: return !!height && Number(height) > 0;
      case 6: return activityLevel !== null;
      case 7: return goal !== null;
      case 8: return true;
      case 9: return true;
      default: return false;
    }
  }

  // Auto-advance helper for single-select choices
  function handleSelectAndAdvance<T>(setter: (val: T) => void, val: T) {
    setter(val);
    setTimeout(() => {
      if (step < TOTAL_STEPS) setStep((s) => s + 1);
    }, 250); // slight delay so user sees selection state
  }

  async function handleFinish() {
    setSaving(true);
    const profile: UserProfile = {
      name:                name.trim(),
      age:                 Number(age),
      sex:                 sex ?? "other",
      weight:              Number(weight),
      weightUnit,
      height:              Number(height),
      heightUnit,
      activityLevel:       activityLevel ?? "moderate",
      goal:                goal ?? "maintain",
      dietaryRestrictions: dietary,
      wantsAIAdvisor:      wantsAI,
    };
    setUserProfile(profile);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      background: "var(--color-bg)", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-step {
          animation: slideUpFade 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .huge-input {
          width: 100%;
          font-size: 2.5rem;
          font-weight: 800;
          text-align: center;
          background: transparent;
          border: none;
          border-bottom: 3px solid var(--color-surface-2);
          color: var(--color-text-1);
          padding: 0.5rem;
          outline: none;
          transition: border-color 0.2s;
          border-radius: 0;
        }
        .huge-input:focus {
          border-bottom-color: var(--color-primary);
        }
        .huge-input::placeholder {
          color: var(--color-text-3);
          opacity: 0.4;
        }
        .choice-btn {
          width: 100%;
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          border: 2px solid var(--color-border);
          background: var(--color-surface-1);
          color: var(--color-text-1);
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .choice-btn:hover {
          background: var(--color-surface-2);
        }
        .choice-btn.selected {
          border-color: var(--color-primary);
          background: var(--color-primary-ghost);
          color: var(--color-primary-light);
        }
      `}</style>

      {/* Progress Header */}
      <div style={{ padding: "1.5rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                background: "transparent", border: "none", color: "var(--color-text-2)",
                fontSize: "1.2rem", cursor: "pointer", padding: "0.5rem"
              }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: "2.2rem" }} /> /* Spacer to keep alignment */
          )}
          <div style={{ flex: 1, height: 6, background: "var(--color-surface-2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--color-primary)", borderRadius: 3, transition: "width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)" }} />
          </div>
          <div style={{ width: "2.2rem", textAlign: "right", fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 600 }}>
            {step}/{TOTAL_STEPS}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "2rem", width: "100%", maxWidth: 500, margin: "0 auto",
      }}>
        
        <div key={step} className="animate-step" style={{ width: "100%" }}>
          
          {/* ── Step 1: Name ─────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👋</div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "2rem" }}>What should we call you?</h2>
              <input
                className="huge-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* ── Step 2: Age ──────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>How old are you?</h2>
              <p style={{ color: "var(--color-text-3)", marginBottom: "2rem", fontSize: "0.9rem" }}>Required for accurate calorie targets.</p>
              <input
                className="huge-input"
                type="number"
                min="10" max="120"
                placeholder="e.g. 20"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* ── Step 3: Sex ──────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem", textAlign: "center" }}>Biological Sex</h2>
              <p style={{ color: "var(--color-text-3)", marginBottom: "2rem", fontSize: "0.9rem", textAlign: "center" }}>Used for the Mifflin-St Jeor metabolic formula.</p>
              
              <button className={`choice-btn ${sex === "male" ? "selected" : ""}`} onClick={() => handleSelectAndAdvance(setSex, "male")}>
                Male
              </button>
              <button className={`choice-btn ${sex === "female" ? "selected" : ""}`} onClick={() => handleSelectAndAdvance(setSex, "female")}>
                Female
              </button>
              <button className={`choice-btn ${sex === "other" ? "selected" : ""}`} onClick={() => handleSelectAndAdvance(setSex, "other")}>
                Prefer not to say
              </button>
            </div>
          )}

          {/* ── Step 4: Weight ───────────────────────────────────── */}
          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "2rem" }}>Current Weight</h2>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                <div style={{ display: "flex", background: "var(--color-surface-2)", borderRadius: "var(--radius-full)", padding: 4 }}>
                  {(["lbs", "kg"] as const).map((u) => (
                    <button
                      key={u} onClick={() => setWeightUnit(u)}
                      style={{
                        padding: "0.5rem 1.5rem", borderRadius: "var(--radius-full)", border: "none",
                        fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s",
                        background: weightUnit === u ? "var(--color-primary)" : "transparent",
                        color: weightUnit === u ? "#fff" : "var(--color-text-2)",
                      }}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <input
                className="huge-input"
                type="number"
                min="0"
                placeholder={weightUnit === "lbs" ? "160" : "73"}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* ── Step 5: Height ───────────────────────────────────── */}
          {step === 5 && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "2rem" }}>How tall are you?</h2>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                <div style={{ display: "flex", background: "var(--color-surface-2)", borderRadius: "var(--radius-full)", padding: 4 }}>
                  {(["in", "cm"] as const).map((u) => (
                    <button
                      key={u} onClick={() => setHeightUnit(u)}
                      style={{
                        padding: "0.5rem 1.5rem", borderRadius: "var(--radius-full)", border: "none",
                        fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s",
                        background: heightUnit === u ? "var(--color-primary)" : "transparent",
                        color: heightUnit === u ? "#fff" : "var(--color-text-2)",
                      }}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <input
                className="huge-input"
                type="number"
                min="0"
                placeholder={heightUnit === "in" ? "70" : "178"}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* ── Step 6: Activity Level ───────────────────────────── */}
          {step === 6 && (
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "2rem", textAlign: "center" }}>How active are you?</h2>
              
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`choice-btn ${activityLevel === opt.value ? "selected" : ""}`}
                  onClick={() => handleSelectAndAdvance(setActivityLevel, opt.value)}
                  style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem", padding: "1rem 1.25rem" }}
                >
                  <div>{opt.label}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500, opacity: 0.7 }}>{opt.description}</div>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 7: Goal ─────────────────────────────────────── */}
          {step === 7 && (
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "2rem", textAlign: "center" }}>What is your goal?</h2>
              
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`choice-btn ${goal === opt.value ? "selected" : ""}`}
                  onClick={() => handleSelectAndAdvance(setGoal, opt.value)}
                  style={{ padding: "1.5rem" }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontSize: "1.5rem" }}>{opt.emoji}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 8: Dietary Preferences ──────────────────────── */}
          {step === 8 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>Dietary Preferences</h2>
                <p style={{ color: "var(--color-text-3)", fontSize: "0.9rem" }}>Select all that apply.</p>
              </div>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", marginBottom: "3rem" }}>
                {DIETARY_OPTIONS.map((pref) => {
                  const active = dietary.includes(pref);
                  return (
                    <button
                      key={pref}
                      onClick={() => toggleDietary(pref)}
                      style={{
                        padding: "0.75rem 1.5rem", borderRadius: "var(--radius-full)",
                        border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: active ? "var(--color-primary-ghost)" : "var(--color-surface-2)",
                        color: active ? "var(--color-primary-light)" : "var(--color-text-1)",
                        fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 9: AI Nutritionist ──────────────────────────── */}
          {step === 9 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "var(--radius-md)", margin: "0 auto 1.5rem",
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.75rem", fontWeight: 800, color: "#fff",
                  boxShadow: "0 4px 12px rgba(196, 30, 58, 0.3)"
                }}>AI</div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>AI Nutritionist</h2>
                <p style={{ color: "var(--color-text-3)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  Would you like our personalized AI advisor to help you choose the best foods from the dining hall?
                </p>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Enable AI Advisor</span>
                <button
                  onClick={() => setWantsAI(!wantsAI)}
                  style={{
                    width: 60, height: 34, borderRadius: 17,
                    background: wantsAI ? "var(--color-primary)" : "var(--color-text-3)",
                    border: "none", position: "relative", cursor: "pointer",
                    transition: "background 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 3, left: wantsAI ? 29 : 3,
                    transition: "left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }} />
                </button>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-3)", textAlign: "center", marginTop: "1.5rem" }}>
                You can adjust all of your preferences later in your Profile.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer / Continue Button (Bottom docked) */}
      <div style={{ padding: "1.5rem", paddingBottom: "2.5rem", width: "100%", maxWidth: 500, margin: "0 auto", visibility: [3, 6, 7].includes(step) ? "hidden" : "visible" }}>
        {step < TOTAL_STEPS ? (
          <button
            className="btn-primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            style={{
              width: "100%", padding: "1.25rem", fontSize: "1.1rem", borderRadius: "var(--radius-lg)",
              opacity: canAdvance() ? 1 : 0.4, transition: "all 0.2s",
            }}
          >
            Continue
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleFinish}
            disabled={saving}
            style={{
              width: "100%", padding: "1.25rem", fontSize: "1.1rem", borderRadius: "var(--radius-lg)",
              opacity: saving ? 0.6 : 1, transition: "all 0.2s",
            }}
          >
            {saving ? "Saving Profile..." : "Let's Go! 🚀"}
          </button>
        )}
      </div>

    </div>
  );
}
