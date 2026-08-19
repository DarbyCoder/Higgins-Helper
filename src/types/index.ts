/**
 * @file src/types/index.ts
 * @description Frontend TypeScript interfaces for Higgins Helper.
 * These mirror the server-side types but are scoped to what the client needs.
 * The menu data types match the DailyMenuResponse shape returned by /api/menu.
 */

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTED MENU DATA TYPES (mirrors server/types/index.ts)
// These are the shapes returned by GET /api/menu
// ─────────────────────────────────────────────────────────────────────────────

export interface NutritionFact {
  label: string;
  unit: string;
  value: number;
  percentDrv: number | null;
  isSecondary?: boolean;
}

export interface DietaryAttribute {
  icon: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  servingSize: string;
  calories: number;
  protein: number;
  totalFat: number;
  totalCarbs: number;
  sodium: number;
  fiber: number;
  facts: NutritionFact[];
  attributes: DietaryAttribute[];
  ingredientsList: string;
  allergensList: string;
  disclaimer: string;
}

export interface FoodStation {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface MealPeriod {
  name: string;
  startTime: string;
  endTime: string;
  stations: FoodStation[];
}

export interface DiningLocation {
  slug: string;
  name: string;
  url: string;
  isOpen: boolean;
  meals: MealPeriod[];
}

export interface DailyMenuResponse {
  date: string;
  fetchedAt: string;
  locations: DiningLocation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD LOG TYPES
// Client-side only, persisted to localStorage via Zustand persist middleware
// ─────────────────────────────────────────────────────────────────────────────

/** Which meal of the day a food entry belongs to. */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * A single food item that a user has added to their log.
 * Macro values are pre-multiplied by servings at log time.
 */
export interface LoggedFoodEntry {
  id: string;           // UUID — identifies this specific log entry
  menuItemId: string;   // References the MenuItem.id it was logged from
  menuItemName: string; // Denormalized: stored so log renders without menu data
  locationName: string; // Denormalized: e.g. "The Table at Higgins"
  mealSlot: MealSlot;
  servings: number;     // Quantity multiplier (default: 1)
  // Macro fields are PER ENTRY TOTAL (= per-item value * servings)
  calories: number;
  protein: number;
  totalFat: number;
  totalCarbs: number;
  sodium: number;
  fiber: number;
  loggedAt: string;     // ISO 8601 timestamp
}

/**
 * Aggregated macro totals for a single day.
 * Computed from the entries array — never stored separately.
 */
export interface MacroTotals {
  calories: number;
  protein: number;
  totalFat: number;
  totalCarbs: number;
  sodium: number;
  fiber: number;
}

/**
 * All food entries for a single calendar day, plus computed totals.
 */
export interface DailyFoodLog {
  date: string;           // "YYYY-MM-DD"
  entries: LoggedFoodEntry[];
  totals: MacroTotals;    // Always kept in sync with entries[]
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE & MACRO TARGETS
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type WeightGoal = "lose" | "maintain" | "gain";

export type WeightUnit = "lbs" | "kg";

export type HeightUnit = "in" | "cm";

export interface UserProfile {
  name: string;
  weight: number;
  weightUnit: WeightUnit;
  height: number;
  heightUnit: HeightUnit;
  age: number;
  sex: "male" | "female" | "other";
  activityLevel: ActivityLevel;
  goal: WeightGoal;
  dietaryRestrictions: string[]; // e.g. ["vegan", "made_without_gluten"]
  wantsAIAdvisor?: boolean;
}

/**
 * The user's daily macro targets — either AI-calculated from profile or
 * manually set.
 */
export interface MacroTargets {
  calories: number;
  protein: number;   // grams
  totalFat: number;  // grams
  totalCarbs: number; // grams
  fiber: number;     // grams
  sodium: number;    // mg
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CHAT
// ─────────────────────────────────────────────────────────────────────────────

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
