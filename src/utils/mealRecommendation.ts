/**
 * @file src/utils/mealRecommendation.ts
 * @description Deterministic "what should I eat next" scorer for the dashboard.
 *
 * Picks up to 3 items from Higgins's currently-open meal period that best fit
 * the user's remaining macros for the day. Pure function — no API calls — so
 * the dashboard can render recommendations instantly and offline.
 */
import type {
  DailyMenuResponse,
  DiningLocation,
  LoggedFoodEntry,
  MacroTargets,
  MacroTotals,
  MealPeriod,
  MenuItem,
} from "@/types";
import { filterByDietary } from "./dietary";
import { findActiveMealPeriod } from "./time";

export type RecommendationReason = "protein" | "fit" | "light" | "fiber";

export interface RecommendedItem {
  item: MenuItem;
  stationName: string;
  score: number;
  reason: RecommendationReason;
}

export interface RecommendationResult {
  location: DiningLocation | undefined;
  activeMeal: MealPeriod | undefined;
  items: RecommendedItem[];
  /** True if the meal is open but the dietary filter removed every item. */
  filteredOut: boolean;
}

const MAX_RESULTS = 3;
/** Skip condiments, dressings, plain water, etc. */
const MIN_ITEM_CALORIES = 40;
/** A dining-hall meal is usually several items, so one item targets ~half the meal budget. */
const ITEM_SHARE_OF_MEAL = 0.5;
/** Clamp for the per-item calorie target so tiny/huge budgets stay sensible. */
const MIN_PORTION = 200;
const MAX_PORTION = 600;

/** Finds the Higgins location in a daily menu (matches "Higgins" or "The Table at Higgins"). */
export function findHigginsLocation(menu: DailyMenuResponse | null | undefined): DiningLocation | undefined {
  return menu?.locations.find((l) => {
    const name = l.name.toLowerCase();
    return name.includes("higgins") || name.includes("table");
  });
}

function num(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function recommendMeals(
  menu: DailyMenuResponse | null | undefined,
  totals: MacroTotals,
  targets: MacroTargets,
  entries: LoggedFoodEntry[],
  dietaryRestrictions: string[],
  now: Date = new Date()
): RecommendationResult {
  const location   = findHigginsLocation(menu);
  const activeMeal = location ? findActiveMealPeriod(location.meals, now) : undefined;
  if (!location || !activeMeal) {
    return { location, activeMeal, items: [], filteredOut: false };
  }

  // ── Flatten items across stations, de-duplicating by name ──
  const loggedIds = new Set(entries.map((e) => e.menuItemId));
  const seen = new Set<string>();
  const candidates: Array<{ item: MenuItem; stationName: string }> = [];
  for (const station of activeMeal.stations ?? []) {
    for (const item of filterByDietary(station.items, dietaryRestrictions)) {
      const key = (item.name ?? "").trim().toLowerCase();
      if (!key || seen.has(key) || loggedIds.has(item.id)) continue;
      if (num(item.calories) < MIN_ITEM_CALORIES) continue;
      seen.add(key);
      candidates.push({ item, stationName: station.name });
    }
  }

  const hasAnyItems = (activeMeal.stations ?? []).some((s) => (s.items ?? []).length > 0);
  if (candidates.length === 0) {
    return { location, activeMeal, items: [], filteredOut: hasAnyItems && dietaryRestrictions.length > 0 };
  }

  // ── Daily budget context ──
  // Meals left = the active period plus any later periods today (min 1)
  const activeIdx = location.meals.indexOf(activeMeal);
  const mealsLeft = Math.max(1, location.meals.length - activeIdx);

  const remainingCal     = targets.calories - totals.calories;
  const overGoal         = remainingCal <= 0;
  const targetPortion    = clamp((remainingCal / mealsLeft) * ITEM_SHARE_OF_MEAL, MIN_PORTION, MAX_PORTION);
  const remainingProtein = Math.max(0, targets.protein - totals.protein);
  const proteinPerMeal   = Math.max(10, remainingProtein / mealsLeft);
  const remainingSodium  = Math.max(0, targets.sodium - totals.sodium);
  const sodiumPerMeal    = remainingSodium / mealsLeft;
  const sodiumTight      = targets.sodium > 0 && remainingSodium < targets.sodium * 0.35;

  // Protein matters more the further protein progress lags calorie progress
  const calProgress     = targets.calories > 0 ? totals.calories / targets.calories : 0;
  const proteinProgress = targets.protein  > 0 ? totals.protein  / targets.protein  : 1;
  const proteinWeight   = remainingProtein <= 0
    ? 0
    : clamp(0.35 + Math.max(0, calProgress - proteinProgress) * 2, 0.35, 1.2);

  const scored: RecommendedItem[] = candidates.map(({ item, stationName }) => {
    const cal     = num(item.calories);
    const protein = num(item.protein);
    const sodium  = num(item.sodium);
    const fiber   = num(item.fiber);

    // Sodium penalty: only for items that blow past the per-meal sodium share
    const sodiumOver    = Math.max(0, sodium - sodiumPerMeal);
    const sodiumPenalty = sodiumOver > 0
      ? Math.min(1, sodiumOver / Math.max(sodiumPerMeal, 300)) * (sodiumTight ? 1 : 0.25)
      : 0;

    if (overGoal) {
      // Already over calories: reward the lightest, most filling options
      const lightness = 1 - Math.min(1, cal / 400);
      const fiberScore = Math.min(1, fiber / 5);
      const proteinDensity = Math.min(1, (protein * 4) / Math.max(cal, 1) / 0.4);
      const score = lightness + fiberScore * 0.6 + proteinDensity * 0.2 - sodiumPenalty;
      const reason: RecommendationReason = fiberScore >= 0.6 ? "fiber" : "light";
      return { item, stationName, score, reason };
    }

    const calorieFit   = Math.max(0, 1 - Math.abs(cal - targetPortion) / targetPortion);
    const proteinScore = Math.min(1, protein / proteinPerMeal);
    const score = calorieFit + proteinScore * proteinWeight - sodiumPenalty;
    const reason: RecommendationReason =
      proteinWeight > 0 && proteinScore * proteinWeight >= calorieFit * 0.6 && protein >= 15
        ? "protein"
        : "fit";
    return { item, stationName, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return { location, activeMeal, items: scored.slice(0, MAX_RESULTS), filteredOut: false };
}
