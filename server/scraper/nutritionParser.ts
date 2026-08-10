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
 * @param raw - A single entry from the `facts` array in the nutrition JSON
 * @returns A normalized NutritionFact object
 */
function normalizeNutritionFact(
  raw: RawNutritionBlob["facts"][number]
): NutritionFact {
  return {
    label: raw.label,
    unit: raw.unit,
    value: typeof raw.value === "number" ? Number(raw.value.toFixed(2)) : 0,
    percentDrv: raw.percent_drv,
    ...(raw.is_secondary !== undefined && { isSecondary: raw.is_secondary }),
  };
}

/**
 * Extracts a numeric macro value from the facts array by its well-known label.
 * Returns 0 if the label is not found (graceful degradation).
 *
 * @param facts - The normalized array of nutrition facts
 * @param label - One of the FACT_LABEL constant strings
 */
function extractFactValue(facts: NutritionFact[], label: string): number {
  const fact = facts.find((f) => f.label === label);
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
  if (!raw.name || !Array.isArray(raw.facts)) {
    console.warn(
      `[nutritionParser] Malformed nutrition blob for recipe ${recipeId}: missing name or facts`
    );
    return null;
  }

  // ── 3. Normalize all nutrition facts ──
  const facts = raw.facts.map(normalizeNutritionFact);

  // ── 4. Extract dietary attributes from the anchor's CSS classes ──
  // Classes like "prop-vegan", "prop-vegetarian" → DietaryAttribute[]
  // Cross-reference with the `attributes` array in the JSON for the human-readable name.
  const attributeMap = new Map(
    (raw.attributes ?? []).map((a) => [a.icon, a.name])
  );

  const dietaryAttributes: DietaryAttribute[] = dietaryClasses
    .filter((cls) => cls.startsWith(DIETARY_CLASS_PREFIX))
    .map((cls) => {
      const icon = cls.slice(DIETARY_CLASS_PREFIX.length);
      return {
        icon,
        name: attributeMap.get(icon) ?? icon, // Fall back to the raw icon string
      };
    });

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
