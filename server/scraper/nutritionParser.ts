/**
 * @file server/scraper/nutritionParser.ts
 * @description Parses the raw nutrition JSON blobs embedded in hidden <div>
 * elements on Clark dining location pages.
 *
 * KEY DISCOVERY: The site embeds complete nutrition data as inline JSON inside
 * elements like: <div id="recipe-nutrition-cmVjaXBlOjY0ODMwNw" style="display:none">
 * { ...full JSON object... }
 * </div>
 *
 * This means we never need to make additional HTTP requests for nutritional
 * data — it's all present in the initial page load.
 */

import type {
  MenuItem,
  NutritionFact,
  DietaryAttribute,
  RawNutritionBlob,
} from "../types/index.js";
import { FACT_LABEL, DIETARY_CLASS_PREFIX } from "./selectors.js";

// ─── Nutrition Fact Normalization ─────────────────────────────────────────────

/**
 * Normalizes a single fact entry from the raw JSON blob into our typed shape.
 * The raw blob uses `percent_drv` and `is_secondary`; we camelCase these.
 *
 * Fix #9: The site sometimes sends macro values as strings (e.g. "15", "12g",
 * "<1"). Previously `typeof raw.value === "number"` would default to 0 for all
 * string values. Now we strip non-numeric characters and parse as float.
 *
 * @param raw - A single entry from the `facts` array in the nutrition JSON
 * @returns A normalized NutritionFact object
 */
function normalizeNutritionFact(
  raw: RawNutritionBlob["facts"][number]
): NutritionFact {
  // Fix #9: Coerce string values to numbers, stripping units like "g" or "<"
  let numVal = 0;
  if (typeof raw.value === "number") {
    numVal = isNaN(raw.value) ? 0 : Number(raw.value.toFixed(2));
  } else if (typeof raw.value === "string") {
    // Strip any non-numeric prefix/suffix: "<1" → 1, "12g" → 12, "0.5" → 0.5
    const parsed = parseFloat((raw.value as string).replace(/[^0-9.]/g, ""));
    numVal = isNaN(parsed) ? 0 : parsed;
  }

  return {
    label: raw.label,
    unit: raw.unit,
    value: numVal,
    percentDrv: raw.percent_drv,
    ...(raw.is_secondary !== undefined && { isSecondary: raw.is_secondary }),
  };
}

// ─── Label Alias Map ─────────────────────────────────────────────────────────
//
// Fix #6: The site doesn't always use the exact same label strings as FACT_LABEL.
// This map normalizes case and handles common aliases so we never return 0
// for a macro simply because the label casing or phrasing varied.

const LABEL_ALIASES: Map<string, string> = new Map([
  // Calories
  ["calories", FACT_LABEL.CALORIES],
  ["energy", FACT_LABEL.CALORIES],
  // Total Fat
  ["total fat", FACT_LABEL.TOTAL_FAT],
  ["fat", FACT_LABEL.TOTAL_FAT],
  // Total Carbs
  ["total carbohydrate", FACT_LABEL.TOTAL_CARBS],
  ["total carbohydrates", FACT_LABEL.TOTAL_CARBS],
  ["carbohydrates", FACT_LABEL.TOTAL_CARBS],
  ["carbs", FACT_LABEL.TOTAL_CARBS],
  // Protein
  ["protein", FACT_LABEL.PROTEIN],
  // Sodium
  ["sodium", FACT_LABEL.SODIUM],
  // Fiber
  ["dietary fiber", FACT_LABEL.FIBER],
  ["fiber", FACT_LABEL.FIBER],
  ["total dietary fiber", FACT_LABEL.FIBER],
]);

/**
 * Extracts a numeric macro value from the facts array by its well-known label.
 * Returns 0 if the label is not found (graceful degradation).
 *
 * Fix #6: Previously used strict `===` which failed whenever the site used
 * a synonym or different casing (e.g. "Total Carbohydrates" vs "Total Carbohydrate").
 * Now normalizes both sides to lowercase and resolves via the alias map.
 *
 * @param facts - The normalized array of nutrition facts
 * @param label - One of the FACT_LABEL constant strings
 */
function extractFactValue(facts: NutritionFact[], label: string): number {
  const normalizedTarget = label.toLowerCase().trim();

  const fact = facts.find((f) => {
    const normalizedLabel = f.label.trim().toLowerCase();
    // Direct match first, then alias lookup
    return (
      normalizedLabel === normalizedTarget ||
      LABEL_ALIASES.get(normalizedLabel) === label
    );
  });

  return fact ? Number(fact.value.toFixed(2)) : 0;
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

/**
 * Parses the raw JSON string extracted from a hidden nutrition <div> into a
 * fully typed MenuItem object.
 *
 * @param recipeId - The base64 recipe ID (from the anchor's `data-recipe` attr)
 * @param rawJsonText - The raw text content of the hidden div
 * @param dietaryClasses - Array of class names from the anchor (e.g. ["show-nutrition", "prop-vegan"])
 * @returns A complete MenuItem, or null if parsing fails
 */
export function parseNutritionBlob(
  recipeId: string,
  rawJsonText: string,
  dietaryClasses: string[]
): MenuItem | null {
  // ── 1. Parse the raw JSON safely ──
  let raw: RawNutritionBlob;
  try {
    const trimmed = rawJsonText.trim();
    if (!trimmed) {
      console.warn(`[nutritionParser] Empty JSON blob for recipe: ${recipeId}`);
      return null;
    }
    raw = JSON.parse(trimmed) as RawNutritionBlob;
  } catch (err) {
    console.error(
      `[nutritionParser] Failed to parse JSON for recipe ${recipeId}:`,
      err
    );
    return null;
  }

  // ── 2. Validate required fields ──
  // Fix #10: Previously returned null if `raw.facts` was missing (null/undefined).
  // Many valid dining items simply have no nutrition data filled in yet.
  // Instead of discarding the item entirely, treat missing facts as an empty array
  // so the item still appears on the menu (just without macro values).
  if (!raw.name) {
    console.warn(
      `[nutritionParser] Malformed nutrition blob for recipe ${recipeId}: missing name`
    );
    return null;
  }

  const rawFacts = Array.isArray(raw.facts) ? raw.facts : [];
  if (!Array.isArray(raw.facts)) {
    console.warn(
      `[nutritionParser] Recipe ${recipeId} ("${raw.name}") has no facts array — ` +
      `returning item with zero macros rather than discarding it`
    );
  }

  // ── 3. Normalize all nutrition facts ──
  const facts = rawFacts.map(normalizeNutritionFact);

  // ── 4. Extract dietary attributes ──
  // Fix #3.4: The previous implementation only looked at CSS classes, silently
  // dropping attributes that are in the raw JSON but not reflected as CSS classes.
  // Now we merge both sources: CSS prop-* classes AND raw.attributes from the JSON.

  // Build a map from icon → name using the JSON attributes array
  const attributeMap = new Map(
    (raw.attributes ?? []).map((a) => [a.icon, a.name])
  );

  // Collect icons from CSS classes (e.g. "prop-vegan" → "vegan")
  const cssIcons = new Set(
    dietaryClasses
      .filter((cls) => cls.startsWith(DIETARY_CLASS_PREFIX))
      .map((cls) => cls.slice(DIETARY_CLASS_PREFIX.length))
  );

  // Collect all icons from raw.attributes that weren't already in CSS classes
  const jsonOnlyIcons = (raw.attributes ?? [])
    .map((a) => a.icon)
    .filter((icon) => !cssIcons.has(icon));

  // Merge: CSS icons first (preserving order), then any JSON-only additions
  const allIcons = [...cssIcons, ...jsonOnlyIcons];

  const dietaryAttributes: DietaryAttribute[] = allIcons.map((icon) => ({
    icon,
    name: attributeMap.get(icon) ?? icon, // Fall back to raw icon string if no name
  }));

  // ── 5. Build the final MenuItem with pre-extracted macro fields ──
  return {
    id: recipeId,
    name: raw.name,
    description: raw.description ?? "",
    servingSize: raw.serving_size ?? "1 serving",
    calories: extractFactValue(facts, FACT_LABEL.CALORIES),
    protein: extractFactValue(facts, FACT_LABEL.PROTEIN),
    totalFat: extractFactValue(facts, FACT_LABEL.TOTAL_FAT),
    totalCarbs: extractFactValue(facts, FACT_LABEL.TOTAL_CARBS),
    sodium: extractFactValue(facts, FACT_LABEL.SODIUM),
    fiber: extractFactValue(facts, FACT_LABEL.FIBER),
    facts,
    attributes: dietaryAttributes,
    ingredientsList: raw.ingredients_list ?? "",
    allergensList: raw.allergens_list ?? "",
    disclaimer: raw.disclaimer ?? "",
  };
}
