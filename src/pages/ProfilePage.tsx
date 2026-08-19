/**
 * @file src/pages/ProfilePage.tsx
 * @description User profile settings with onboarding form.
 * Sets name, weight, height, age, sex, activity level, goal, and dietary restrictions.
 * Macro targets are auto-computed via Mifflin-St Jeor TDEE on save.
 */
import { useState } from "react";
import { useUserStore, calculateMacroTargets, useThemeStore } from "@/stores";
import { useAuth } from "@/firebase/AuthProvider";
import type { UserProfile, ActivityLevel, WeightGoal } from "@/types";


const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary — desk job, classes, little movement",
  light: "Lightly Active — light walks or 1–2 gym sessions/week",
  moderate: "Moderately Active — 3–4 workouts/week, intramurals",
  active: "Very Active — athlete or intense training 5–6 days/week",
  very_active: "Extremely Active — physical job or 2-a-day training",
};

const GOAL_LABELS: Record<WeightGoal, string> = {
  lose: "Lose weight (−500 kcal/day)",
  maintain: "Maintain weight",
  gain: "Gain muscle (+300 kcal/day)",
};

const DIETARY_OPTIONS = [
  { icon: "vegan", label: "Vegan" },
  { icon: "vegetarian", label: "Vegetarian" },
  { icon: "made_without_gluten", label: "Gluten-free" },
  { icon: "halal", label: "Halal" },
  { icon: "kosher", label: "Kosher" },
];

export default function ProfilePage() {
  const { userProfile, setUserProfile, macroTargets, setMacroTargets, resetMacroTargetsToAuto, macroTargetsManuallySet, activeOverrideIndex, setActiveOverrideIndex } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuth();
  const isDark = theme === "dark";


  // Form state seeded from existing profile
  const [form, setForm] = useState<Partial<UserProfile>>({
    name: userProfile?.name ?? "",
    weight: userProfile?.weight ?? 155,
    weightUnit: userProfile?.weightUnit ?? "lbs",
    height: userProfile?.height ?? 68,
    heightUnit: userProfile?.heightUnit ?? "in",
    age: userProfile?.age ?? 20,
    sex: userProfile?.sex ?? "other",
    activityLevel: userProfile?.activityLevel ?? "light",
    goal: userProfile?.goal ?? "maintain",
    dietaryRestrictions: userProfile?.dietaryRestrictions ?? [],
    wantsAIAdvisor: userProfile?.wantsAIAdvisor ?? true,
  });
  const [saved, setSaved] = useState(false);

  function field<K extends keyof UserProfile>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      setForm((f) => ({ ...f, [key]: val }));
    };
  }

  function toggleRestriction(icon: string) {
    setForm((f) => {
      const current = f.dietaryRestrictions ?? [];
      return {
        ...f,
        dietaryRestrictions: current.includes(icon)
          ? current.filter((r) => r !== icon)
          : [...current, icon],
      };
    });
  }

  function handleSave() {
    const profile = form as UserProfile;
    setUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Preview auto-calculated targets based on current form values
  const previewTargets = calculateMacroTargets(form as UserProfile);

  return (
    <div className="page stagger">
      {/* Personal info */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="section-title">Personal Info</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <FieldRow label="Name">
            <input className="input" placeholder="Your name" value={form.name ?? ""} onChange={field("name")} />
          </FieldRow>
          <FieldRow label="Age">
            <input className="input" type="number" min={13} max={100} value={form.age} onChange={field("age")} />
          </FieldRow>
          <FieldRow label="Sex">
            <select className="select" value={form.sex} onChange={field("sex")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Prefer not to say</option>
            </select>
          </FieldRow>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.5rem" }}>
            <FieldRow label="Weight">
              <input className="input" type="number" min={50} max={500} value={form.weight} onChange={field("weight")} />
            </FieldRow>
            <FieldRow label="Unit">
              <select className="select" value={form.weightUnit} onChange={field("weightUnit")}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </FieldRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.5rem" }}>
            <FieldRow label="Height">
              <input className="input" type="number" min={36} max={96} value={form.height} onChange={field("height")} />
            </FieldRow>
            <FieldRow label="Unit">
              <select className="select" value={form.heightUnit} onChange={field("heightUnit")}>
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </FieldRow>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="section-title">Goals & Activity</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <FieldRow label="Activity Level">
            <select className="select" value={form.activityLevel} onChange={field("activityLevel")}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Goal">
            <select className="select" value={form.goal} onChange={field("goal")}>
              {(Object.keys(GOAL_LABELS) as WeightGoal[]).map((k) => (
                <option key={k} value={k}>{GOAL_LABELS[k]}</option>
              ))}
            </select>
          </FieldRow>
        </div>
      </div>

      {/* Dietary restrictions */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="section-title">Dietary Preferences</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {DIETARY_OPTIONS.map(({ icon, label }) => {
            const isActive = (form.dietaryRestrictions ?? []).includes(icon);
            return (
              <button key={icon} onClick={() => toggleRestriction(icon)} style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "var(--radius-full)",
                border: isActive ? "1px solid #10b981" : "1px solid var(--color-border)",
                background: isActive ? "rgba(16,185,129,0.12)" : "transparent",
                color: isActive ? "#34d399" : "var(--color-text-2)",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                transition: "all 0.16s",
              }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculated macro targets preview */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Macro Targets</div>
          {macroTargetsManuallySet && (
            <button className="btn-ghost" onClick={resetMacroTargetsToAuto} style={{ fontSize: "0.65rem" }}>
              Reset to auto
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {([
            { label: "Calories", val: previewTargets.calories, unit: "cal", color: "#c41e3a" },
            { label: "Protein", val: previewTargets.protein, unit: "g", color: "#10b981" },
            { label: "Carbs", val: previewTargets.totalCarbs, unit: "g", color: "#3b82f6" },
            { label: "Fat", val: previewTargets.totalFat, unit: "g", color: "#f59e0b" },
            { label: "Fiber", val: previewTargets.fiber, unit: "g", color: "#8b5cf6" },
            { label: "Sodium", val: previewTargets.sodium, unit: "mg", color: "#64748b" },
          ] as const).map(({ label, val, unit, color }) => (
            <div key={label} style={{ textAlign: "center", padding: "0.5rem 0.25rem", background: `${color}10`, borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)" }}>{unit}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.68rem", color: "var(--color-text-3)" }}>
          Calculated using Mifflin-St Jeor TDEE formula. Targets update automatically when you save.
        </p>
      </div>

      {/* ── Macro Goal Override ── */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        {/* Header row with toggle switch */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div>
            <div className="section-title" style={{ marginBottom: 0 }}>Goal Overrides</div>
            <div style={{ fontSize: "0.68rem", color: "var(--color-text-3)", marginTop: 2 }}>
              Override the auto-calculated macro targets
            </div>
          </div>
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={macroTargetsManuallySet}
            onClick={() => macroTargetsManuallySet ? resetMacroTargetsToAuto() : undefined}
            style={{
              width: 44, height: 24, borderRadius: 999, border: "none", padding: 0,
              background: macroTargetsManuallySet
                ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
                : "var(--color-surface-3)",
              position: "relative", cursor: "pointer",
              transition: "background 0.2s",
              flexShrink: 0,
              boxShadow: macroTargetsManuallySet ? "0 0 10px rgba(196,30,58,0.35)" : "none",
            }}
            aria-label="Toggle goal overrides"
          >
            <span style={{
              position: "absolute", top: 4,
              left: macroTargetsManuallySet ? 23 : 4,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }} />
          </button>
        </div>

        {/* Inputs — shown and unlocked only when override is active */}
        {macroTargetsManuallySet ? (
          <>
            <div style={{
              padding: "0.45rem 0.7rem", borderRadius: "var(--radius-md)", margin: "0.65rem 0",
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
              fontSize: "0.7rem", color: "#f59e0b",
            }}>
              ⚠️ Auto-calculation is paused. Toggle off to restore.
            </div>

            {/* Override Presets Tabs */}
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem", background: "var(--color-surface-2)", padding: "0.25rem", borderRadius: "var(--radius-md)" }}>
              {[1, 2, 3, 4].map((num, i) => {
                const isActive = activeOverrideIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveOverrideIndex(i)}
                    style={{
                      flex: 1, padding: "0.4rem 0", fontSize: "0.75rem", fontWeight: 600,
                      borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                      background: isActive ? "var(--color-primary)" : "transparent",
                      color: isActive ? "#fff" : "var(--color-text-3)",
                      transition: "all 0.2s"
                    }}
                  >
                    Set {num}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
              {([
                { label: "Calories (cal)", key: "calories" as const, color: "#c41e3a" },
                { label: "Protein (g)", key: "protein" as const, color: "#10b981" },
                { label: "Carbs (g)", key: "totalCarbs" as const, color: "#3b82f6" },
                { label: "Fat (g)", key: "totalFat" as const, color: "#f59e0b" },
              ]).map(({ label, key, color }) => (
                <div key={key}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-3)", display: "block", marginBottom: "0.3rem" }}>
                    {label}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={macroTargets[key]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setMacroTargets({ ...macroTargets, [key]: val });
                      }
                    }}
                    style={{ borderColor: color + "55" }}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            marginTop: "0.65rem", padding: "0.65rem 0.75rem",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-3)",
            fontSize: "0.72rem", color: "var(--color-text-3)",
            textAlign: "center",
          }}>
            Toggle on to manually set your calorie and macro goals
          </div>
        )}

        {/* Activation button when switch is off */}
        {!macroTargetsManuallySet && (
          <button
            className="btn-ghost"
            onClick={() => setMacroTargets({ ...macroTargets })}
            style={{ width: "100%", justifyContent: "center", marginTop: "0.65rem", fontSize: "0.8rem" }}
          >
            Enable overrides
          </button>
        )}
      </div>

      {/* ── Push Notifications ── */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div className="section-title">Notifications</div>
        <div style={{
          padding: "0.65rem 0.85rem", borderRadius: "var(--radius-md)", marginBottom: "0.75rem",
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
          fontSize: "0.75rem", color: "#f59e0b", lineHeight: 1.5,
        }}>
          ⚠️ <strong>Beta feature.</strong> Push notifications require installing Higgins Helper as a PWA. Tap the share button in your browser and choose "Add to Home Screen" first.
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--color-text-1)" }}>
              Meal Reminders
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2 }}>
              Reminders to log breakfast, lunch, & dinner
            </div>
          </div>
          <button
            onClick={async () => {
              if (!("Notification" in window)) {
                alert("Your browser doesn't support notifications.");
                return;
              }
              const perm = await Notification.requestPermission();
              if (perm === "granted") {
                new Notification("Higgins Helper 🥗", {
                  body: "Notifications enabled! We'll remind you to log your meals.",
                  icon: "/logo-square.jpg",
                });
              } else {
                alert("Notification permission denied. Check your browser settings.");
              }
            }}
            className="btn-ghost"
            style={{ fontSize: "0.75rem" }}
          >
            Enable
          </button>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div className="section-title">Appearance</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--color-text-1)" }}>
              {isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2 }}>
              {isDark ? "Easy on the eyes at night" : "Great for outdoor use"}
            </div>
          </div>
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            style={{
              width: 48, height: 26, borderRadius: 999, border: "none",
              background: isDark
                ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                : "linear-gradient(135deg, #f59e0b, #f97316)",
              position: "relative", cursor: "pointer",
              transition: "background 0.25s", padding: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
            aria-label="Toggle light/dark mode"
          >
            <span style={{
              position: "absolute",
              top: 3, left: isDark ? 25 : 3,
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff",
              transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem",
            }}>{isDark ? "🌙" : "☀️"}</span>
          </button>
        </div>
      </div>

      {/* ── App Features ── */}
      <div className="glass" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div className="section-title">App Features</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--color-text-1)" }}>
              AI Nutritionist
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2 }}>
              Personalized food advice using Gemini
            </div>
          </div>
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={form.wantsAIAdvisor}
            onClick={() => setForm((f) => ({ ...f, wantsAIAdvisor: !f.wantsAIAdvisor }))}
            style={{
              width: 48, height: 26, borderRadius: 999, border: "none",
              background: form.wantsAIAdvisor ? "var(--color-primary)" : "var(--color-surface-3)",
              position: "relative", cursor: "pointer",
              transition: "background 0.25s", padding: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
            aria-label="Toggle AI Advisor"
          >
            <span style={{
              position: "absolute",
              top: 3, left: form.wantsAIAdvisor ? 25 : 3,
              width: 20, height: 20, borderRadius: "50%",
              background: form.wantsAIAdvisor ? "#fff" : "var(--color-text-3)",
              transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.22s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </button>
        </div>
      </div>

      {/* Save */}
      <button className="btn-primary" onClick={handleSave} style={{ width: "100%", justifyContent: "center", padding: "0.9rem" }}>
        {saved ? "✓ Saved!" : "Save Profile"}
      </button>

      {/* Account */}
      <div className="glass" style={{ padding: "1rem", marginTop: "1rem" }}>
        <div className="section-title">Account</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-1)" }}>
              {user?.displayName ?? "Signed in"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2 }}>
              {user?.email}
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(229,57,53,0.35)",
              background: "rgba(229,57,53,0.08)",
              color: "#ef5350",
              fontWeight: 600, fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--color-text-3)", marginTop: "1rem" }}>
        Higgins Helper v0.2.1 · Clark University · Data synced to cloud
      </p>
    </div>
  );
}


function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-3)", marginBottom: "0.3rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
