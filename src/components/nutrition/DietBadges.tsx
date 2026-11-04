/**
 * @file src/components/nutrition/DietBadges.tsx
 * @description A dish's dietary badges. Diet badges (vegan, vegetarian,
 * gluten-free, halal, kosher) are teal with an icon where there's a clear
 * one. "Contains" allergen badges (eggs, dairy, tree nuts) are neutral.
 *
 * `compact` is for menu rows: diets only, short labels ("GF"), small. The full
 * version is for the dish sheet.
 */
import type { ComponentType } from "react";
import { LeafIcon, WheatOffIcon } from "@/components/icons";
import type { DietaryAttribute } from "@/types";

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>;

const DIETS: Record<string, { short: string; long: string; Icon?: IconType }> = {
  vegan:               { short: "Vegan",  long: "Vegan",            Icon: LeafIcon },
  vegetarian:          { short: "Veg",    long: "Vegetarian",       Icon: LeafIcon },
  made_without_gluten: { short: "GF",     long: "Made w/o gluten",  Icon: WheatOffIcon },
  halal:               { short: "Halal",  long: "Halal" },
  kosher:              { short: "Kosher", long: "Kosher" },
};

const CONTAINS: Record<string, string> = {
  eggs:      "Contains eggs",
  milk:      "Contains dairy",
  tree_nuts: "Contains tree nuts",
  peanuts:   "Contains peanuts",
  soy:       "Contains soy",
  wheat:     "Contains wheat",
  fish:      "Contains fish",
  shellfish: "Contains shellfish",
  sesame:    "Contains sesame",
};

/** Vegan already says vegetarian, so showing both is noise. */
function dietsOf(attrs: DietaryAttribute[]): string[] {
  const keys = attrs.map((a) => a.icon).filter((k) => k in DIETS);
  return keys.includes("vegan") ? keys.filter((k) => k !== "vegetarian") : keys;
}

export default function DietBadges({ attributes, compact = false }: { attributes: DietaryAttribute[]; compact?: boolean }) {
  const attrs = Array.isArray(attributes) ? attributes : [];
  const diets = dietsOf(attrs);
  const contains = compact ? [] : attrs.filter((a) => !(a.icon in DIETS));
  if (diets.length === 0 && contains.length === 0) return null;

  const size = compact
    ? { font: "0.65rem", pad: "0.12rem 0.45rem", padIcon: "0.35rem", icon: 11, gap: 3 }
    : { font: "0.72rem", pad: "0.25rem 0.65rem", padIcon: "0.5rem", icon: 13, gap: 5 };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? "0.25rem" : "0.35rem" }}>
      {diets.map((key) => {
        const { short, long, Icon } = DIETS[key]!;
        return (
          <span key={key} title={long} style={{
            display: "inline-flex", alignItems: "center", gap: size.gap,
            padding: size.pad,
            paddingLeft: Icon ? size.padIcon : undefined,
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary-ghost)", color: "var(--color-primary-light)",
            fontSize: size.font, fontWeight: 600, whiteSpace: "nowrap",
          }}>
            {Icon && <Icon size={size.icon} strokeWidth={2.1} />}
            {compact ? short : long}
          </span>
        );
      })}
      {contains.map((a) => (
        <span key={a.icon} style={{
          display: "inline-flex", alignItems: "center",
          padding: size.pad, borderRadius: "var(--radius-full)",
          background: "var(--color-surface-3)", color: "var(--color-text-2)",
          fontSize: size.font, fontWeight: 600, whiteSpace: "nowrap",
        }}>
          {CONTAINS[a.icon] ?? a.name ?? a.icon.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}
