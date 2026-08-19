/**
 * @file server/types/index.ts
 * @description Shared TypeScript interfaces for the Higgins Helper backend.
 * These types are the single source of truth for all scraped menu data structures.
 */

// ─── Nutrition Facts ─────────────────────────────────────────────────────────

/**
 * A single row from the nutrition facts panel.
 * The `facts` array in the scraped JSON follows this structure exactly.
 */
export interface NutritionFact {
  label: string; // e.g. "Calories", "Total Fat", "Protein"
  unit: string; // e.g. "g", "mg", "mcg", "" (empty string for Calories)
  value: number;
  percentDrv: number | null; // % Daily Reference Value — can be null (e.g. Total Sugars)
  isSecondary?: boolean; // true for sub-items: Saturated Fat, Trans Fat, Added Sugars, etc.
}

// ─── Dietary Attributes ──────────────────────────────────────────────────────

/**
 * A dietary label on a menu item (vegan, vegetarian, made_without_gluten, etc.)
 * Maps to the CSS class `prop-{icon}` on the anchor tag, and to the `attributes` array in the JSON blob.
 */
export interface DietaryAttribute {
  icon: string; // e.g. "vegan", "vegetarian", "made_without_gluten"
  name: string; // Human-readable e.g. "Vegan", "Made without Gluten"
}

// ─── Menu Item ───────────────────────────────────────────────────────────────

/**
 * A single food item served at a dining station.
 * Nutrition data is parsed from the hidden JSON div on the location page.
 */
export interface MenuItem {
  id: string; // Base64-encoded recipe ID from `data-recipe` attribute
  name: string; // e.g. "Just® Scrambled Eggs"
  description: string; // e.g. "Plant-based scrambled eggs"
  servingSize: string; // e.g. "0.5 cup", "1 each"
  calories: number; // Extracted from facts for O(1) access
  protein: number; // grams — extracted from facts for O(1) access
  totalFat: number; // grams — extracted from facts for O(1) access
  totalCarbs: number; // grams — extracted from facts for O(1) access
  sodium: number; // mg — extracted from facts for O(1) access
  fiber: number; // grams — extracted from facts for O(1) access
  facts: NutritionFact[]; // Full nutrition facts array (all rows)
  attributes: DietaryAttribute[]; // Dietary icons / labels
  ingredientsList: string;
  allergensList: string;
  disclaimer: string;
}

// ─── Food Station ────────────────────────────────────────────────────────────

/**
 * A named serving station within a dining location (e.g. "allgood", "grill").
 * Each station has its own section on the menu page under an h4 toggle.
 */
export interface FoodStation {
  id: string; // From `data-id` on the h4 toggle element
  name: string; // e.g. "allgood", "grill", "deli"
  description?: string; // e.g. "made without the top 9 allergens & gluten"
  items: MenuItem[];
}

// ─── Meal Period ─────────────────────────────────────────────────────────────

/**
 * A discrete meal served at a location (Breakfast, Lunch, Dinner, etc.)
 * Maps to a tab on the location page (.c-tab / .c-tabs-nav__link).
 */
export interface MealPeriod {
  name: string; // e.g. "Breakfast", "Lunch", "Dinner"
  startTime: string; // e.g. "7:00 am" — from the root /menu-hours/ page
  endTime: string; // e.g. "11:00 am"
  stations: FoodStation[];
}

// ─── Dining Location ─────────────────────────────────────────────────────────

/**
 * A single dining hall or food venue.
 * Top-level entity: each location row on /menu-hours/ becomes one of these.
 */
export interface DiningLocation {
  slug: string; // e.g. "the-table-at-higgins"
  name: string; // e.g. "The Table at Higgins"
  url: string; // Full URL with ?date= query param already appended
  isOpen: boolean; // Whether this location is operating on the requested date
  meals: MealPeriod[];
}

// ─── API Response ────────────────────────────────────────────────────────────

/**
 * The top-level response shape returned by GET /api/menu.
 */
export interface DailyMenuResponse {
  date: string; // "YYYY-MM-DD"
  fetchedAt: string; // ISO 8601 timestamp of when the scrape completed
  locations: DiningLocation[];
}

// ─── Internal Scraper Types ───────────────────────────────────────────────────

/**
 * The raw shape of the nutrition JSON blob embedded in each menu item's
 * hidden <div>. This is what the site serves before we normalize it.
 */
export interface RawNutritionBlob {
  name: string;
  description: string;
  disclaimer: string;
  serving_size: string;
  attributes: Array<{ icon: string; name: string }>;
  ingredients_list: string;
  allergens_list: string;
  facts: Array<{
    label: string;
    unit: string;
    value: number;
    percent_drv: number | null;
    is_secondary?: boolean;
  }>;
  hideAllergens: boolean;
}

/**
 * An intermediate representation of a location extracted from the root
 * /menu-hours/ page, before the full location menu has been scraped.
 */
export interface LocationStub {
  slug: string;
  name: string;
  url: string;
  isOpen: boolean;
  hoursText: string; // Raw hours string for debugging
  meals: Array<{
    name: string;
    startTime: string;
    endTime: string;
  }>;
}

// ─── Cache Entry ─────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  cachedAt: number; // Unix timestamp (ms)
  ttlMs: number;
}
