/**
 * @file src/components/menu/NutritionModal.tsx
 * @description Full-screen bottom sheet displaying the FDA-style Nutrition Facts
 * label for a selected menu item, plus a quick-add food log button.
 * The nutrition label is rendered as declarative React SVG (no D3 dependency).
 */
import { useEffect, useState } from "react";
import type { MenuItem, MealSlot } from "@/types";
import { useFoodLogStore, useDateStore } from "@/stores";

interface Props {
  item: MenuItem | null;
  locationName: string;
  sourceMealName?: string;
  onClose: () => void;
}

// ── Dietary icon display names ──
const ICON_LABELS: Record<string, string> = {
  vegan:               "Vegan",
  vegetarian:          "Vegetarian",
  made_without_gluten: "Made w/o Gluten",
  halal:               "Halal",
  kosher:              "Kosher",
  eggs:                "Contains Eggs",
  milk:                "Contains Dairy",
  tree_nuts:           "Contains Tree Nuts",
};

// ── React SVG FDA Nutrition Facts Label (#7 #8) ───────────────────────────────
// Replaces the D3 implementation. Renders the same label declaratively as JSX,
// eliminating the ~50KB D3 bundle and the useEffect DOM-mutation anti-pattern.
function NutritionFactsLabel({ item }: { item: MenuItem }) {
  const W = 280;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const rows: React.ReactElement[] = [];
  let y = 0;

  function hRule(yy: number, thick: number, color = "#000") {
    rows.push(
      <rect key={`hr-${yy}`} x={0} y={yy} width={W} height={thick} fill={color} />
    );
    return yy + thick;
  }

  // White background
  rows.push(<rect key="bg" width={W} height={800} fill="#fff" />);

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
        {fact.label} {fact.value}{fact.unit}
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
    rows.push(<rect key={`rule-${idx}`} x={0} y={y} width={W} height={fact.isSecondary ? 0.3 : 0.5} fill={fact.isSecondary ? "#ccc" : "#888"} />);
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
  rows.push(<rect key="end-rule" x={0} y={fY} width={W} height={4} fill="#000" />);
  fY += 4;

  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius-md)", overflow: "hidden", padding: "0.5rem" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${fY + 4}`} style={{ display: "block" }}>
        {rows}
      </svg>
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

export default function NutritionModal({ item, locationName, sourceMealName, onClose }: Props) {
  const [servings, setServings]   = useState(1);
  const [mealSlot, setMealSlot]   = useState<MealSlot>("lunch");
  const [justAdded, setJustAdded] = useState(false);

  const { selectedDate }  = useDateStore();
  const { addFoodEntry }  = useFoodLogStore();

  // Reset state when item changes
  useEffect(() => {
    setServings(1);
    setJustAdded(false);

    if (sourceMealName) {
      const name = sourceMealName.toLowerCase();
      if (name.includes("breakfast")) setMealSlot("breakfast");
      else if (name.includes("lunch")) setMealSlot("lunch");
      else if (name.includes("dinner")) setMealSlot("dinner");
      else setMealSlot("snack");
    }
  }, [item, sourceMealName]);

  if (!item) return null;

  function handleAdd() {
    if (!item) return;
    addFoodEntry(selectedDate, mealSlot, item, locationName, servings);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  const modalId = "nutrition-modal-title";

  return (
    /* Backdrop (#11) — keyboard-accessible so pressing Enter/Space or clicking closes the modal */
    <div
      role="button"
      tabIndex={0}
      aria-label="Close nutrition panel"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      {/* Sheet — clicking inside stops propagation so it doesn't close the modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          width: "100%", maxWidth: 480, margin: "0 auto",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          maxHeight: "90dvh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "0.75rem" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--color-surface-3)" }} />
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "0 1rem 1rem", flex: 1 }}>
          {/* Item header */}
          <div style={{ marginBottom: "0.75rem" }}>
            <h2 id={modalId} style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-1)" }}>{item.name}</h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--color-text-2)" }}>{locationName}</p>
            {item.description && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--color-text-3)", fontStyle: "italic" }}>{item.description}</p>
            )}
          </div>

          {/* Dietary attributes */}
          {item.attributes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.75rem" }}>
              {item.attributes.map((a) => (
                <span key={a.icon} className="badge badge-green" style={{ fontSize: "0.65rem" }}>
                  {ICON_LABELS[a.icon] ?? a.name}
                </span>
              ))}
            </div>
          )}

          {/* Quick macro row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem",
            marginBottom: "1rem",
          }}>
            {([
              { label: "Cal",     value: Math.round(item.calories * servings), color: "#c41e3a" },
              { label: "Protein", value: `${(item.protein * servings).toFixed(1)}g`, color: "#10b981" },
              { label: "Carbs",   value: `${(item.totalCarbs * servings).toFixed(1)}g`, color: "#3b82f6" },
              { label: "Fat",     value: `${(item.totalFat * servings).toFixed(1)}g`, color: "#f59e0b" },
            ] as const).map(({ label, value, color }) => (
              <div key={label} style={{
                textAlign: "center", padding: "0.5rem 0.25rem",
                background: `${color}18`, borderRadius: "var(--radius-sm)",
                border: `1px solid ${color}33`,
              }}>
                <div style={{ fontSize: "1rem", fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* React SVG Nutrition Facts label */}
          <NutritionFactsLabel item={item} />

          {/* Allergens */}
          {item.allergensList && (
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: "0.75rem" }}>
              <strong style={{ color: "var(--color-warning)" }}>Allergens:</strong> {item.allergensList}
            </p>
          )}
        </div>

        {/* Sticky footer: add to log */}
        <div style={{
          padding: "0.85rem 1rem",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex", flexDirection: "column", gap: "0.6rem",
        }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {/* Servings counter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-full)", padding: "0.2rem 0.5rem", border: "1px solid var(--color-border)" }}>
              <button onClick={() => setServings((s) => Math.max(0.5, s - 0.5))} style={{ background: "none", border: "none", color: "var(--color-text-1)", fontSize: "1.1rem", cursor: "pointer", lineHeight: 1, padding: "0 0.2rem" }}>−</button>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: 28, textAlign: "center" }}>{servings}</span>
              <button onClick={() => setServings((s) => s + 0.5)} style={{ background: "none", border: "none", color: "var(--color-text-1)", fontSize: "1.1rem", cursor: "pointer", lineHeight: 1, padding: "0 0.2rem" }}>+</button>
            </div>
            {/* Meal slot selector */}
            <select className="select" value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)} style={{ flex: 1 }}>
              {MEAL_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handleAdd} style={{ width: "100%" }}>
            {justAdded ? "✓ Added!" : `Add ${Math.round(item.calories * servings)} cal to ${mealSlot}`}
          </button>
        </div>
      </div>
    </div>
  );
}
