/**
 * @file src/components/menu/NutritionModal.tsx
 * @description Full-screen bottom sheet displaying the FDA-style Nutrition Facts
 * label for a selected menu item, plus a quick-add food log button.
 * The nutrition label itself is rendered as an SVG using D3 for crisp output.
 */
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { MenuItem, MealSlot } from "@/types";
import { useFoodLogStore, useDateStore } from "@/stores";

interface Props {
  item: MenuItem | null;
  locationName: string;
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

// ── D3 FDA Nutrition Facts Label ──────────────────────────────────────────────
function NutritionFactsLabel({ item }: { item: MenuItem }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = 280;
    let y = 0;
    const bg = svg.append("g");

    function hRule(yy: number, thick: number, color = "#000") {
      bg.append("rect").attr("x", 0).attr("y", yy).attr("width", W).attr("height", thick).attr("fill", color);
      return yy + thick;
    }
    function text(content: string, x: number, yy: number, opts: { size?: number; bold?: boolean; anchor?: string; fill?: string } = {}) {
      bg.append("text")
        .attr("x", x).attr("y", yy)
        .attr("font-family", "Arial, Helvetica, sans-serif")
        .attr("font-size", opts.size ?? 10)
        .attr("font-weight", opts.bold ? "bold" : "normal")
        .attr("text-anchor", opts.anchor ?? "start")
        .attr("fill", opts.fill ?? "#000")
        .text(content);
    }

    // White background
    bg.append("rect").attr("width", W).attr("height", 400).attr("fill", "#fff");

    y = hRule(0, 8);
    y += 2;
    text("Nutrition Facts", 4, y + 26, { size: 28, bold: true });
    y += 30;
    y = hRule(y, 1);
    y += 2;
    text(`Serving size ${item.servingSize}`, 4, y + 11, { size: 11 });
    y += 14;
    y = hRule(y, 8);

    // Calories
    y += 4;
    text("Calories", 4, y + 20, { size: 16, bold: true });
    text(String(item.calories), W - 4, y + 24, { size: 32, bold: true, anchor: "end" });
    y += 30;
    y = hRule(y, 4);

    // % DV header
    y += 3;
    text("% Daily Value*", W - 4, y + 9, { size: 8, bold: true, anchor: "end" });
    y += 12;
    y = hRule(y, 0.5);

    // Facts rows
    item.facts.forEach((fact) => {
      if (fact.label === "Calories") return; // Already shown above
      const indent = fact.isSecondary ? 16 : 4;
      const bold   = !fact.isSecondary;

      y += 3;
      text(`${fact.label} ${fact.value}${fact.unit}`, indent, y + 9, { size: bold ? 9 : 8, bold });
      if (fact.percentDrv !== null) {
        text(`${fact.percentDrv}%`, W - 4, y + 9, { size: 8, bold, anchor: "end" });
      }
      y += 12;
      y = hRule(y, fact.isSecondary ? 0.3 : 0.5, fact.isSecondary ? "#ccc" : "#888");
    });

    // Footnote
    y += 4;
    const footnote = "* The % Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.";
    const words = footnote.split(" ");
    let line = "";
    let fY = y;
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (test.length > 45) {
        bg.append("text").attr("x", 4).attr("y", fY + 8).attr("font-size", 6).attr("font-family", "Arial").text(line);
        fY += 9;
        line = word;
      } else { line = test; }
    });
    if (line) {
      bg.append("text").attr("x", 4).attr("y", fY + 8).attr("font-size", 6).attr("font-family", "Arial").text(line);
      fY += 9;
    }
    fY += 2;
    hRule(fY, 4);
    fY += 4;

    // Set final SVG height
    svg.attr("viewBox", `0 0 ${W} ${fY + 4}`).attr("height", fY + 4);
  }, [item]);

  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius-md)", overflow: "hidden", padding: "0.5rem" }}>
      <svg ref={svgRef} width="100%" style={{ display: "block" }} />
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

export default function NutritionModal({ item, locationName, onClose }: Props) {
  const [servings, setServings]   = useState(1);
  const [mealSlot, setMealSlot]   = useState<MealSlot>("lunch");
  const [justAdded, setJustAdded] = useState(false);

  const { selectedDate }  = useDateStore();
  const { addFoodEntry }  = useFoodLogStore();

  // Reset state when item changes
  useEffect(() => { setServings(1); setJustAdded(false); }, [item]);

  if (!item) return null;

  function handleAdd() {
    if (!item) return;
    addFoodEntry(selectedDate, mealSlot, item, locationName, servings);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    /* Backdrop */
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end",
    }}>
      {/* Sheet */}
      <div onClick={(e) => e.stopPropagation()} className="animate-slide-up" style={{
        width: "100%", maxWidth: 480, margin: "0 auto",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        border: "1px solid var(--color-border)",
        borderBottom: "none",
        maxHeight: "90dvh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "0.75rem" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--color-surface-3)" }} />
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "0 1rem 1rem", flex: 1 }}>
          {/* Item header */}
          <div style={{ marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-1)" }}>{item.name}</h2>
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

          {/* D3 Nutrition Facts label */}
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
            {justAdded ? "✓ Added!" : `Add ${Math.round(item.calories * servings)} kcal to ${mealSlot}`}
          </button>
        </div>
      </div>
    </div>
  );
}
