/**
 * @file src/components/menu/NutritionModal.tsx
 * @description The dish sheet: name and diet badges, the four macro tiles, how
 * the calories split between protein, carbs and fat, and the full Nutrition
 * Facts label folded away below. Adding closes the sheet and shows
 * "Added to Lunch" with Undo.
 *
 * The label is drawn as SVG in the theme's text colour, so it isn't a white
 * slab in dark mode.
 */
import { useEffect, useState } from "react";
import type { MenuItem, MealSlot } from "@/types";
import { useFoodLogStore, useDateStore, useUIStore } from "@/stores";
import MacroTiles from "@/components/nutrition/MacroTiles";
import DietBadges from "@/components/nutrition/DietBadges";
import { ChevronDownIcon, MinusIcon, PlusIcon } from "@/components/icons";

interface Props {
  item: MenuItem | null;
  locationName: string;
  sourceMealName?: string;
  onClose: () => void;
}

/** 183.06 → "183", 2.74 → "2.7": label precision, not the scraper's. */
function labelValue(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return n >= 10 || Number.isInteger(n) ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

// ── React SVG FDA Nutrition Facts Label (#7 #8) ───────────────────────────────
// Replaces the D3 implementation. Renders the same label declaratively as JSX,
// eliminating the ~50KB D3 bundle and the useEffect DOM-mutation anti-pattern.
function NutritionFactsLabel({ item }: { item: MenuItem }) {
  const W = 280;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const rows: React.ReactElement[] = [];
  let y = 0;

  function hRule(yy: number, thick: number, color = "currentColor") {
    rows.push(
      <rect key={`hr-${yy}`} x={0} y={yy} width={W} height={thick} fill={color} />
    );
    return yy + thick;
  }

  y = hRule(0, 8);
  y += 2;
  rows.push(<text key="title" x={4} y={y + 26} fontFamily={fontFamily} fontSize={28} fontWeight="bold">Nutrition Facts</text>);
  y += 30;
  y = hRule(y, 1);
  y += 2;
  rows.push(<text key="serving" x={4} y={y + 11} fontFamily={fontFamily} fontSize={11}>Serving size {item.servingSize}</text>);
  y += 14;
  y = hRule(y, 8);

  // Calories
  y += 4;
  rows.push(<text key="cal-lbl" x={4} y={y + 20} fontFamily={fontFamily} fontSize={16} fontWeight="bold">Calories</text>);
  rows.push(<text key="cal-val" x={W - 4} y={y + 24} fontFamily={fontFamily} fontSize={32} fontWeight="bold" textAnchor="end">{item.calories}</text>);
  y += 30;
  y = hRule(y, 4);

  // % DV header
  y += 3;
  rows.push(<text key="dv-hdr" x={W - 4} y={y + 9} fontFamily={fontFamily} fontSize={8} fontWeight="bold" textAnchor="end">% Daily Value*</text>);
  y += 12;
  y = hRule(y, 0.5);

  // Facts rows
  item.facts.forEach((fact, idx) => {
    if (fact.label === "Calories") return;
    const indent = fact.isSecondary ? 16 : 4;
    const bold = !fact.isSecondary;

    y += 3;
    rows.push(
      <text key={`fact-${idx}`} x={indent} y={y + 9} fontFamily={fontFamily} fontSize={bold ? 9 : 8} fontWeight={bold ? "bold" : "normal"}>
        {fact.label} {labelValue(fact.value)}{fact.unit}
      </text>
    );
    if (fact.percentDrv !== null) {
      rows.push(
        <text key={`pct-${idx}`} x={W - 4} y={y + 9} fontFamily={fontFamily} fontSize={8} fontWeight={bold ? "bold" : "normal"} textAnchor="end">
          {fact.percentDrv}%
        </text>
      );
    }
    y += 12;
    rows.push(<rect key={`rule-${idx}`} x={0} y={y} width={W} height={fact.isSecondary ? 0.3 : 0.5} fill="currentColor" opacity={fact.isSecondary ? 0.25 : 0.5} />);
  });

  // Footnote — word-wrap manually
  y += 4;
  const footnote = "* The % Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.";
  const words = footnote.split(" ");
  let line = "";
  let fY = y;
  const noteLines: string[] = [];
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (test.length > 45) { noteLines.push(line); line = word; }
    else { line = test; }
  });
  if (line) noteLines.push(line);
  noteLines.forEach((nl, i) => {
    rows.push(<text key={`note-${i}`} x={4} y={fY + 8} fontFamily={fontFamily} fontSize={6}>{nl}</text>);
    fY += 9;
  });
  fY += 2;
  rows.push(<rect key="end-rule" x={0} y={fY} width={W} height={4} fill="currentColor" />);
  fY += 4;

  return (
    <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", padding: "0.75rem" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${fY + 4}`} style={{ display: "block", color: "var(--color-text-1)" }} fill="currentColor">
        {rows}
      </svg>
    </div>
  );
}

// ── Calorie split ─────────────────────────────────────────────────────────────

/**
 * Where the calories come from: protein and carbs give 4 kcal a gram, fat 9.
 * Shown as one bar split three ways, with the shares under it.
 */
function MacroSplit({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const parts = [
    { label: "Protein", kcal: protein * 4, color: "var(--color-protein)" },
    { label: "Carbs",   kcal: carbs * 4,   color: "var(--color-carbs)" },
    { label: "Fat",     kcal: fat * 9,     color: "var(--color-fat)" },
  ];
  const total = parts.reduce((a, p) => a + p.kcal, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 2 }}>
        {parts.map((p) => p.kcal > 0 && (
          <div key={p.label} style={{ flex: p.kcal, background: p.color }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
        {parts.map((p) => (
          <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--color-text-2)", fontWeight: 500 }}>
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
            {p.label} <strong style={{ color: "var(--color-text-1)", fontWeight: 700 }}>{Math.round((p.kcal / total) * 100)}%</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch" },
  { value: "dinner",    label: "Dinner" },
  { value: "snack",     label: "Snack" },
];

const STEP_BUTTON: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--color-surface-3)", border: "none",
  color: "var(--color-text-1)", cursor: "pointer",
};

export default function NutritionModal({ item, locationName, sourceMealName, onClose }: Props) {
  const [servings, setServings]   = useState(1);
  const [mealSlot, setMealSlot]   = useState<MealSlot>("lunch");
  const [showLabel, setShowLabel] = useState(false);

  const { selectedDate }  = useDateStore();
  const { addFoodEntry, removeFoodEntry }  = useFoodLogStore();
  const showToast = useUIStore((s) => s.showToast);

  // Reset state when item changes
  useEffect(() => {
    setServings(1);
    setShowLabel(false);

    if (sourceMealName) {
      const name = sourceMealName.toLowerCase();
      if (name.includes("breakfast")) setMealSlot("breakfast");
      else if (name.includes("lunch")) setMealSlot("lunch");
      else if (name.includes("dinner")) setMealSlot("dinner");
      else setMealSlot("snack");
    }
  }, [item, sourceMealName]);

  if (!item) return null;

  const mealLabel = MEAL_SLOTS.find((m) => m.value === mealSlot)!.label;

  /** Adds, closes the sheet, and offers Undo in a toast. */
  function handleAdd() {
    if (!item) return;
    const date = selectedDate;
    const id = addFoodEntry(date, mealSlot, item, locationName, servings);
    try { navigator.vibrate?.(30); } catch { /* not supported */ }
    onClose();
    showToast(`Added to ${mealLabel}`, "success", {
      label: "Undo",
      run: () => removeFoodEntry(date, id),
    });
  }

  const modalId = "nutrition-modal-title";
  const scaled = {
    calories: item.calories * servings,
    protein:  item.protein * servings,
    carbs:    item.totalCarbs * servings,
    fat:      item.totalFat * servings,
  };

  return (
    /* Backdrop (#11) — keyboard-accessible so pressing Enter/Space or clicking closes the modal */
    <div
      role="button"
      tabIndex={0}
      aria-label="Close nutrition panel"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); onClose(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
        animation: "fade-in 0.25s ease both",
      }}
    >
      {/* Sheet — clicking inside stops propagation so it doesn't close the modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation(); }}
        className="animate-slide-up"
        style={{
          width: "100%", maxWidth: 480, margin: "0 auto",
          background: "var(--color-surface)",
          borderRadius: "28px 28px 0 0",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.35)",
          maxHeight: "90dvh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0.6rem 0 0.4rem" }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: "var(--color-border-2)" }} />
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "0.4rem 1.25rem 1.25rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Item header */}
          <div>
            <h2 id={modalId} style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--color-text-1)" }}>{item.name}</h2>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--color-text-2)" }}>
              {locationName}{item.servingSize ? ` · ${item.servingSize}` : ""}
            </p>
            {item.description && (
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--color-text-3)", lineHeight: 1.45 }}>{item.description}</p>
            )}
          </div>

          {/* Estimated nutrition note (Worcester restaurant items) */}
          {item.isEstimate && (
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--color-text-3)" }}>
              <span className="badge badge-amber" style={{ fontSize: "0.62rem", marginRight: "0.4rem" }}>Estimated</span>
              Based on a typical portion; actual values vary.
            </p>
          )}

          <DietBadges attributes={item.attributes} />

          <MacroTiles calories={scaled.calories} protein={scaled.protein} carbs={scaled.carbs} fat={scaled.fat} estimate={item.isEstimate} />

          <MacroSplit protein={scaled.protein} carbs={scaled.carbs} fat={scaled.fat} />

          {/* Full label, folded away */}
          <div>
            <button
              onClick={() => setShowLabel((v) => !v)}
              aria-expanded={showLabel}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.8rem 1rem", borderRadius: "var(--radius-md)", cursor: "pointer",
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                color: "var(--color-text-1)", fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              Full nutrition facts
              <ChevronDownIcon size={18} style={{ color: "var(--color-text-3)", transform: showLabel ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }} />
            </button>
            {showLabel && (
              <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.75rem", animation: "fade-in 0.25s ease both" }}>
                <NutritionFactsLabel item={item} />
                {item.ingredientsList && (
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--color-text-2)" }}>Ingredients:</strong> {item.ingredientsList}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Allergens */}
          {item.allergensList && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-2)", margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--color-text-1)" }}>Allergens:</strong> {item.allergensList}
            </p>
          )}
        </div>

        {/* Sticky footer: add to log */}
        <div style={{
          padding: "0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex", flexDirection: "column", gap: "0.65rem",
        }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {/* Servings counter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-full)", padding: "0.25rem", border: "1px solid var(--color-border)" }}>
              <button onClick={() => setServings((s) => Math.max(0.5, s - 0.5))} style={STEP_BUTTON} aria-label="Fewer servings">
                <MinusIcon size={15} strokeWidth={2.4} />
              </button>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, minWidth: 30, textAlign: "center" }} aria-label={`${servings} servings`}>{servings}</span>
              <button onClick={() => setServings((s) => s + 0.5)} style={STEP_BUTTON} aria-label="More servings">
                <PlusIcon size={15} strokeWidth={2.4} />
              </button>
            </div>
            {/* Meal slot selector */}
            <select className="select" value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)} style={{ flex: 1 }} aria-label="Meal">
              {MEAL_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handleAdd} style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }}>
            Add {item.isEstimate ? "~" : ""}{Math.round(scaled.calories)} cal to {mealLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
