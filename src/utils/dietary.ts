/**
 * @file src/utils/dietary.ts
 * @description Shared dietary-attribute filtering for menu items.
 *
 * Used by both the Menu page's manual filter chips (LocationCard) and the
 * dashboard's meal recommender, so the two can't drift apart.
 */
import type { MenuItem } from "@/types";

/**
 * Maps human-readable labels to the scraped attribute icon keys.
 * Onboarding stores labels ("Gluten-Free") while the Profile page stores
 * icon keys ("made_without_gluten") — both end up in dietaryRestrictions.
 */
const LABEL_TO_ICON: Record<string, string> = {
  "vegan":       "vegan",
  "vegetarian":  "vegetarian",
  "gluten-free": "made_without_gluten",
  "gluten free": "made_without_gluten",
  "halal":       "halal",
  "kosher":      "kosher",
};

/** Normalizes a restriction (label or icon key) to its attribute icon key. */
export function toDietaryIcon(restriction: string): string {
  const key = restriction.trim().toLowerCase();
  return LABEL_TO_ICON[key] ?? key;
}

/**
 * Returns only the items that carry ALL of the given dietary attribute icons.
 * Accepts either icon keys or onboarding labels.
 */
export function filterByDietary(items: MenuItem[], restrictions: string[]): MenuItem[] {
  if (!Array.isArray(items)) return [];
  if (restrictions.length === 0) return items;
  const icons = [...new Set(restrictions.map(toDietaryIcon))];
  return items.filter((i) =>
    // Guard: attributes may be undefined if server returned malformed JSON
    icons.every((icon) => (i.attributes ?? []).some((a) => a.icon === icon))
  );
}
