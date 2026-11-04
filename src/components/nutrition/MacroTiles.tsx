/**
 * @file src/components/nutrition/MacroTiles.tsx
 * @description Four tiles for a dish or food: calories, protein, carbs and fat,
 * each in its nutrient colour, in whole numbers. Used on the dish sheet and
 * the custom food page.
 */
import { formatWhole } from "@/utils/format";

interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Prefix values with "~" (nutrition worked out from a recipe, not measured). */
  estimate?: boolean;
}

export default function MacroTiles({ calories, protein, carbs, fat, estimate }: Props) {
  const approx = estimate ? "~" : "";
  const tiles = [
    { label: "Cal",     value: `${approx}${formatWhole(calories)}`, color: "var(--color-cal)" },
    { label: "Protein", value: `${approx}${formatWhole(protein)}g`, color: "var(--color-protein)" },
    { label: "Carbs",   value: `${approx}${formatWhole(carbs)}g`,   color: "var(--color-carbs)" },
    { label: "Fat",     value: `${approx}${formatWhole(fat)}g`,     color: "var(--color-fat)" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
      {tiles.map(({ label, value, color }) => (
        <div key={label} style={{
          textAlign: "center", padding: "0.6rem 0.25rem 0.55rem",
          borderRadius: "var(--radius-md)",
          background: `color-mix(in srgb, ${color} 11%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
        }}>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.01em", color }}>{value}</div>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-3)", marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
