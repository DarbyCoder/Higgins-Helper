/**
 * @file src/pages/ProfilePage.tsx
 * @description Profile: a summary card (who you are, your daily target, your
 * streak), then iOS-style grouped rows. Tapping a row opens a sheet to change
 * it. Nothing needs saving: choices save as you tap them, and typed details
 * save when their sheet closes (once, not on every keystroke, since each save
 * is a Firestore write).
 */
import { useState, type ComponentType, type ReactNode } from "react";
import { useUserStore, useThemeStore, useUIStore, useFoodLogStore, calculateMacroTargets } from "@/stores";
import { useAuth } from "@/firebase/AuthProvider";
import { LOCAL_MODE } from "@/firebase/localMode";
import { useInstallPrompt, isIOS } from "@/hooks/useInstallPrompt";
import { useMealReminderSwitch } from "@/hooks/useMealReminderSwitch";
import Sheet from "@/components/ui/Sheet";
import Switch from "@/components/ui/Switch";
import {
  ActivityIcon, BellIcon, CheckIcon, ChevronRightIcon, DumbbellIcon, FlameIcon, HelpIcon,
  LeafIcon, LogOutIcon, MoonIcon, PencilIcon, PhoneDownloadIcon, ScaleIcon, SunIcon,
  TargetIcon, TrendDownIcon, UserIcon,
} from "@/components/icons";
import { computeStreak } from "@/utils/streak";
import { formatWhole } from "@/utils/format";
import type { UserProfile, ActivityLevel, WeightGoal, MacroTargets } from "@/types";

/** Local test mode: wipe this browser's saved data and start over at onboarding. */
function resetLocalTestData() {
  if (!window.confirm("Erase the profile, food log and settings saved in this browser?")) return;
  localStorage.clear();
  window.location.reload();
}

const ACTIVITY: Record<ActivityLevel, { name: string; detail: string }> = {
  sedentary:   { name: "Sedentary",         detail: "Desk job, classes, little movement" },
  light:       { name: "Lightly active",    detail: "Light walks or 1–2 gym sessions a week" },
  moderate:    { name: "Moderately active", detail: "3–4 workouts a week, intramurals" },
  active:      { name: "Very active",       detail: "Athlete or intense training 5–6 days a week" },
  very_active: { name: "Extremely active",  detail: "Physical job or two-a-day training" },
};

const GOALS: Record<WeightGoal, { name: string; detail: string; Icon: IconType }> = {
  lose:     { name: "Lose weight",     detail: "500 cal a day under maintenance", Icon: TrendDownIcon },
  maintain: { name: "Maintain weight", detail: "Eat what you burn",               Icon: ScaleIcon },
  gain:     { name: "Gain muscle",     detail: "300 cal a day over maintenance",  Icon: DumbbellIcon },
};

const DIETARY_OPTIONS = [
  { icon: "vegan", label: "Vegan" },
  { icon: "vegetarian", label: "Vegetarian" },
  { icon: "made_without_gluten", label: "Gluten-free" },
  { icon: "halal", label: "Halal" },
  { icon: "kosher", label: "Kosher" },
];

type IconType = ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
type SheetName = "personal" | "goal" | "diet" | "targets" | null;

export default function ProfilePage() {
  const userProfile = useUserStore((s) => s.userProfile);
  const macroTargets = useUserStore((s) => s.macroTargets);
  const manualTargets = useUserStore((s) => s.macroTargetsManuallySet);
  const streak = useFoodLogStore((s) => computeStreak(s.foodLog));
  const { theme, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuth();
  const openTour = useUIStore((s) => s.openTour);
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [sheet, setSheet] = useState<SheetName>(null);

  // Reminders are the account-wide setting on the profile; permission is this
  // browser's. Shared with the intro tour, which can turn them on from here.
  const reminders = useMealReminderSwitch();
  const permission = reminders.permission;

  async function handleToggleReminders() {
    const result = await (reminders.enabled ? reminders.turnOff() : reminders.turnOn());
    if (result === "denied") alert("Notification permission denied. Check your browser settings to enable notifications.");
    else if (result === "failed") alert("Couldn't change meal reminders. Check your connection and try again.");
  }

  async function handleAllowOnThisDevice() {
    if ((await reminders.allowOnThisDevice()) === "failed") {
      alert("Couldn't turn on reminders here. Check your connection and try again.");
    }
  }

  if (!userProfile) return null;
  const p = userProfile;
  const goal = GOALS[p.goal] ?? GOALS.maintain;
  const activity = ACTIVITY[p.activityLevel] ?? ACTIVITY.light;
  const diets = DIETARY_OPTIONS.filter((d) => p.dietaryRestrictions?.includes(d.icon)).map((d) => d.label);

  const installHint = isInstalled
    ? "Installed"
    : isInstallable ? "Works offline, opens like an app"
    : isIOS ? "Safari: Share, then Add to Home Screen"
    : "Use your browser's menu";

  return (
    <div className="page stagger">
      {/* ── Who you are ── */}
      <SummaryCard
        name={p.name}
        subtitle={`${goal.name} · ${activity.name}`}
        calories={macroTargets.calories}
        protein={macroTargets.protein}
        streak={streak}
        onEdit={() => setSheet("personal")}
      />

      <Group title="You">
        <Row Icon={UserIcon} label="Personal details" value={`${p.age} · ${p.weight} ${p.weightUnit} · ${p.height} ${p.heightUnit}`} onClick={() => setSheet("personal")} />
        <Row Icon={goal.Icon} label="Goal & activity" value={goal.name} onClick={() => setSheet("goal")} />
        <Row Icon={LeafIcon} label="Diet" value={diets.length ? diets.join(", ") : "None"} onClick={() => setSheet("diet")} />
        <Row Icon={TargetIcon} label="Daily targets" value={`${formatWhole(macroTargets.calories)} cal · ${manualTargets ? "Custom" : "Auto"}`} onClick={() => setSheet("targets")} />
      </Group>

      {/* The intro tour's last step spotlights this group */}
      <Group title="Notifications" tour="notifications">
        <Row
          Icon={BellIcon}
          label="Meal reminders"
          detail={reminders.enabled ? "On: 8am, noon and 8pm Eastern" : "A nudge at 8am, noon and 8pm Eastern"}
          trailing={
            <Switch
              checked={reminders.enabled}
              onChange={handleToggleReminders}
              disabled={permission === "unsupported" || reminders.busy}
              label="Meal reminders"
            />
          }
        />
        {permission === "unsupported" && (
          <Note tone="danger">
            {isIOS
              ? "On iPhone, notifications only work once the app is installed. In Safari, tap Share, then Add to Home Screen, and open it from there."
              : "This browser can't show notifications."}
          </Note>
        )}
        {reminders.enabled && permission === "denied" && (
          <Note tone="warning">Notifications are blocked on this device. Allow them in your browser's settings to get reminders here.</Note>
        )}
        {reminders.enabled && permission === "default" && (
          <Row Icon={CheckIcon} label="Allow notifications on this device" accent onClick={handleAllowOnThisDevice} />
        )}
      </Group>

      <Group title="App">
        <Row
          Icon={theme === "dark" ? MoonIcon : SunIcon}
          label="Dark mode"
          trailing={<Switch checked={theme === "dark"} onChange={toggleTheme} label="Toggle light/dark mode" />}
        />
        <Row
          Icon={PhoneDownloadIcon}
          label="Install Higgins Helper"
          detail={installHint}
          value={isInstallable ? "Install" : undefined}
          onClick={isInstallable ? promptInstall : undefined}
        />
        <Row Icon={HelpIcon} label="App tour" value="Replay" onClick={openTour} />
      </Group>

      <Group title="Account">
        <Row
          Icon={UserIcon}
          label={LOCAL_MODE ? "Local test mode" : user?.displayName ?? p.name ?? "Signed in"}
          detail={LOCAL_MODE ? "Saved in this browser only" : user?.email ?? undefined}
        />
        <Row
          Icon={LogOutIcon}
          label={LOCAL_MODE ? "Reset test data" : "Sign out"}
          danger
          onClick={LOCAL_MODE ? resetLocalTestData : signOut}
        />
      </Group>

      <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--color-text-3)", margin: "0.5rem 0 0" }}>
        Higgins Helper v1.0.5 · Clark University · {LOCAL_MODE ? "Local test mode" : "Synced to your account"}
      </p>

      {sheet === "personal" && <PersonalSheet profile={p} onClose={() => setSheet(null)} />}
      {sheet === "goal" && <GoalSheet profile={p} onClose={() => setSheet(null)} />}
      {sheet === "diet" && <DietSheet profile={p} onClose={() => setSheet(null)} />}
      {sheet === "targets" && <TargetsSheet profile={p} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ name, subtitle, calories, protein, streak, onEdit }: {
  name: string; subtitle: string; calories: number; protein: number; streak: number; onEdit: () => void;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="glass" style={{ padding: "1.15rem", marginBottom: "1.5rem", borderRadius: "var(--radius-xl)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
        <div aria-hidden style={{
          width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
          display: "grid", placeItems: "center",
          background: "linear-gradient(135deg, #1CB394, #0A5C4E)",
          boxShadow: "0 6px 18px rgba(20,160,133,0.35)",
          color: "#fff", fontSize: "1.4rem", fontWeight: 800,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name || "Your profile"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)", marginTop: 2 }}>{subtitle}</div>
        </div>
        <button
          onClick={onEdit}
          aria-label="Edit personal details"
          style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            display: "grid", placeItems: "center",
            background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text-1)",
          }}
        >
          <PencilIcon size={16} />
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginTop: "1.1rem",
        paddingTop: "1rem", borderTop: "1px solid var(--color-border)",
      }}>
        <Stat label="Daily goal" value={formatWhole(calories)} unit="cal" />
        <Stat label="Protein" value={formatWhole(protein)} unit="g" divider />
        <Stat label="Streak" value={String(streak)} unit={streak === 1 ? "day" : "days"} divider
          icon={streak > 0 ? <FlameIcon size={15} style={{ color: "var(--color-streak)" }} /> : undefined} />
      </div>
    </div>
  );
}

function Stat({ label, value, unit, divider, icon }: { label: string; value: string; unit: string; divider?: boolean; icon?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", borderLeft: divider ? "1px solid var(--color-border)" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {icon}
        <span style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--color-text-3)" }}>{unit}</span>
      </div>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Grouped rows ─────────────────────────────────────────────────────────────

function Group({ title, tour, children }: { title: string; tour?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "1.4rem" }}>
      <h2 style={{
        margin: "0 0 0.5rem 0.9rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--color-text-3)",
      }}>
        {title}
      </h2>
      <div className="glass profile-group" data-tour={tour} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", padding: 0 }}>
        {children}
      </div>
    </section>
  );
}

function Row({ Icon, label, value, detail, trailing, onClick, danger, accent }: {
  Icon: IconType;
  label: string;
  /** Short current value, on the right. */
  value?: string;
  /** A line under the label. */
  detail?: string;
  /** Replaces the value and chevron, e.g. a switch. */
  trailing?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  const color = danger ? "var(--color-danger)" : accent ? "var(--color-primary-light)" : "var(--color-text-1)";
  const inner = (
    <>
      <span aria-hidden style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        display: "grid", placeItems: "center",
        background: danger ? "color-mix(in srgb, var(--color-danger) 14%, transparent)" : "var(--color-primary-ghost)",
        color: danger ? "var(--color-danger)" : "var(--color-primary-light)",
      }}>
        <Icon size={17} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color }}>{label}</span>
        {detail && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>{detail}</span>}
      </span>
      {trailing ?? (
        <>
          {value && (
            <span style={{ fontSize: "0.82rem", color: "var(--color-text-2)", maxWidth: "48%", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {value}
            </span>
          )}
          {onClick && !danger && !accent && <ChevronRightIcon size={16} style={{ color: "var(--color-text-3)", flexShrink: 0 }} />}
        </>
      )}
    </>
  );
  const style: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", gap: "0.8rem",
    padding: "0.75rem 0.9rem", background: "none", border: "none", textAlign: "left",
    color: "var(--color-text-1)", font: "inherit",
  };
  return onClick
    ? <button className="profile-row" onClick={onClick} style={{ ...style, cursor: "pointer" }}>{inner}</button>
    : <div className="profile-row" style={style}>{inner}</div>;
}

function Note({ tone, children }: { tone: "danger" | "warning"; children: ReactNode }) {
  const color = tone === "danger" ? "#ef4444" : "#e5a13a";
  return (
    <div className="profile-row" style={{ padding: "0.65rem 0.9rem 0.75rem 3.6rem", fontSize: "0.75rem", lineHeight: 1.5, color }}>
      {children}
    </div>
  );
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

/** Typed details: kept as a draft and saved once, when the sheet closes. */
function PersonalSheet({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [draft, setDraft] = useState({
    name: profile.name, age: String(profile.age), sex: profile.sex,
    weight: String(profile.weight), weightUnit: profile.weightUnit,
    height: String(profile.height), heightUnit: profile.heightUnit,
  });
  const set = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  function saveAndClose() {
    const current = useUserStore.getState().userProfile;
    if (current) {
      // A number left blank or out of range keeps the old value
      const n = (v: string, old: number, min: number, max: number) => {
        const x = Number(v);
        return Number.isFinite(x) && x >= min && x <= max ? x : old;
      };
      const next: UserProfile = {
        ...current,
        name: draft.name.trim() || current.name,
        age: n(draft.age, current.age, 13, 100),
        sex: draft.sex,
        weight: n(draft.weight, current.weight, 50, 700),
        weightUnit: draft.weightUnit,
        height: n(draft.height, current.height, 36, 250),
        heightUnit: draft.heightUnit,
      };
      const changed = (Object.keys(next) as (keyof UserProfile)[]).some((k) => next[k] !== current[k]);
      if (changed) useUserStore.getState().setUserProfile(next);
    }
    onClose();
  }

  return (
    <Sheet title="Personal details" onClose={saveAndClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <Field label="Name"><input className="input" value={draft.name} onChange={set("name")} autoComplete="given-name" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
          <Field label="Age"><input className="input" type="number" inputMode="numeric" value={draft.age} onChange={set("age")} /></Field>
          <Field label="Sex">
            <select className="select" value={draft.sex} onChange={set("sex")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Prefer not to say</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.6rem" }}>
          <Field label="Weight"><input className="input" type="number" inputMode="decimal" value={draft.weight} onChange={set("weight")} /></Field>
          <Field label="Unit">
            <select className="select" value={draft.weightUnit} onChange={set("weightUnit")}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.6rem" }}>
          <Field label="Height"><input className="input" type="number" inputMode="decimal" value={draft.height} onChange={set("height")} /></Field>
          <Field label="Unit">
            <select className="select" value={draft.heightUnit} onChange={set("heightUnit")}>
              <option value="in">in</option>
              <option value="cm">cm</option>
            </select>
          </Field>
        </div>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
          Used to work out your daily targets. Saved when you close this.
        </p>
      </div>
    </Sheet>
  );
}

/** Choices: each tap saves straight away. */
function GoalSheet({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const save = (patch: Partial<UserProfile>) => {
    const current = useUserStore.getState().userProfile;
    if (current) useUserStore.getState().setUserProfile({ ...current, ...patch });
  };
  return (
    <Sheet title="Goal & activity" onClose={onClose}>
      <SheetLabel>Goal</SheetLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {(Object.keys(GOALS) as WeightGoal[]).map((k) => (
          <Choice key={k} Icon={GOALS[k].Icon} name={GOALS[k].name} detail={GOALS[k].detail}
            selected={profile.goal === k} onClick={() => save({ goal: k })} />
        ))}
      </div>
      <SheetLabel>Activity</SheetLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(Object.keys(ACTIVITY) as ActivityLevel[]).map((k) => (
          <Choice key={k} Icon={ActivityIcon} name={ACTIVITY[k].name} detail={ACTIVITY[k].detail}
            selected={profile.activityLevel === k} onClick={() => save({ activityLevel: k })} />
        ))}
      </div>
    </Sheet>
  );
}

function DietSheet({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const selected = profile.dietaryRestrictions ?? [];
  const toggle = (icon: string) => {
    const current = useUserStore.getState().userProfile;
    if (!current) return;
    const list = current.dietaryRestrictions ?? [];
    useUserStore.getState().setUserProfile({
      ...current,
      dietaryRestrictions: list.includes(icon) ? list.filter((r) => r !== icon) : [...list, icon],
    });
  };
  return (
    <Sheet title="Diet" onClose={onClose}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {DIETARY_OPTIONS.map(({ icon, label }) => {
          const on = selected.includes(icon);
          return (
            <button key={icon} onClick={() => toggle(icon)} aria-pressed={on} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.55rem 0.95rem", borderRadius: "var(--radius-full)", cursor: "pointer",
              border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border-2)"}`,
              background: on ? "var(--color-primary-ghost)" : "transparent",
              color: on ? "var(--color-primary-light)" : "var(--color-text-1)",
              fontSize: "0.88rem", fontWeight: 600,
            }}>
              {on && <CheckIcon size={15} strokeWidth={2.5} />}
              {label}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function TargetsSheet({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const { macroTargets, setMacroTargets, resetMacroTargetsToAuto, macroTargetsManuallySet: manual, activeOverrideIndex, setActiveOverrideIndex } = useUserStore();
  const auto = calculateMacroTargets(profile);
  const shown: MacroTargets = manual ? macroTargets : auto;

  const ROWS = [
    { label: "Calories", key: "calories" as const,   unit: "cal", color: "var(--color-cal)" },
    { label: "Protein",  key: "protein" as const,    unit: "g",   color: "var(--color-protein)" },
    { label: "Carbs",    key: "totalCarbs" as const, unit: "g",   color: "var(--color-carbs)" },
    { label: "Fat",      key: "totalFat" as const,   unit: "g",   color: "var(--color-fat)" },
    { label: "Fiber",    key: "fiber" as const,      unit: "g",   color: "var(--color-fiber)" },
    { label: "Sodium",   key: "sodium" as const,     unit: "mg",  color: "var(--color-sodium)" },
  ];

  return (
    <Sheet title="Daily targets" onClose={onClose}>
      <div className="glass" style={{ padding: "0.25rem 0.9rem", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0" }}>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: "0.9rem", fontWeight: 600 }}>Set my own targets</span>
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>
              {manual ? "Your numbers, not the calculated ones" : "Worked out from your details and goal"}
            </span>
          </span>
          <Switch
            checked={manual}
            onChange={() => (manual ? resetMacroTargetsToAuto() : setMacroTargets({ ...macroTargets }))}
            label="Set my own targets"
          />
        </div>
      </div>

      {manual && (
        <div role="tablist" aria-label="Target sets" style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", background: "var(--color-surface-2)", padding: "0.25rem", borderRadius: "var(--radius-md)" }}>
          {[0, 1, 2, 3].map((i) => (
            <button key={i} role="tab" aria-selected={activeOverrideIndex === i} onClick={() => setActiveOverrideIndex(i)} style={{
              flex: 1, padding: "0.45rem 0", fontSize: "0.78rem", fontWeight: 600,
              borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
              background: activeOverrideIndex === i ? "var(--color-primary)" : "transparent",
              color: activeOverrideIndex === i ? "#fff" : "var(--color-text-2)",
            }}>
              Set {i + 1}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        {ROWS.map(({ label, key, unit, color }) => (
          <div key={key} style={{ padding: "0.7rem 0.8rem", borderRadius: "var(--radius-md)", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-3)" }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
              {label}
            </div>
            {manual && key !== "fiber" && key !== "sodium" ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                <input
                  type="number" inputMode="numeric" min={0} aria-label={`${label} target`}
                  value={macroTargets[key]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val > 0) setMacroTargets({ ...macroTargets, [key]: val });
                  }}
                  style={{
                    width: "100%", minWidth: 0, background: "none", border: "none", outline: "none", padding: 0,
                    borderBottom: `1.5px solid ${color}`,
                    color: "var(--color-text-1)", fontSize: "1.15rem", fontWeight: 800, fontFamily: "inherit",
                  }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-3)" }}>{unit}</span>
              </div>
            ) : (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: "1.15rem", fontWeight: 800 }}>{formatWhole(shown[key])}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginLeft: 3 }}>{unit}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: "1rem 0 0", fontSize: "0.72rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
        {manual
          ? "Changes save as you type. Fiber and sodium stay at the recommended amounts."
          : "Calculated with the Mifflin-St Jeor formula, and updated whenever your details or goal change."}
      </p>
    </Sheet>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-3)", marginBottom: "0.35rem" }}>{label}</span>
      {children}
    </label>
  );
}

function SheetLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-3)", margin: "0 0 0.5rem 0.2rem" }}>
      {children}
    </div>
  );
}

function Choice({ Icon, name, detail, selected, onClick }: { Icon: IconType; name: string; detail: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={selected} className="pressable" style={{
      display: "flex", alignItems: "center", gap: "0.8rem", width: "100%", textAlign: "left",
      padding: "0.75rem 0.9rem", borderRadius: "var(--radius-md)", cursor: "pointer",
      background: selected ? "var(--color-primary-ghost)" : "var(--color-surface-2)",
      border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
      color: "var(--color-text-1)",
    }}>
      <Icon size={20} style={{ color: selected ? "var(--color-primary-light)" : "var(--color-text-2)", flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.9rem", fontWeight: 600 }}>{name}</span>
        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 1 }}>{detail}</span>
      </span>
      {selected && <CheckIcon size={18} strokeWidth={2.5} style={{ color: "var(--color-primary-light)", flexShrink: 0 }} />}
    </button>
  );
}
