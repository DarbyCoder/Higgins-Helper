/**
 * @file src/utils/menuHelpers.ts
 * @description Small helpers for the Menu tab: the High protein threshold,
 * which log slot a meal period goes in, and how meal and station names show.
 */
import type { MealSlot } from "@/types";
import { mapMealPeriodNameToSlot } from "@/utils/time";

/** "High protein" chip: at least this many grams. */
export const HIGH_PROTEIN_G = 20;

export const num = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * The log slot for a meal period. An all-day period like the Bistro's
 * "Lunch / dinner" counts as dinner from 4 pm.
 */
export function mealSlotFor(mealName: string, now: Date = new Date()): MealSlot {
  const n = (mealName ?? "").toLowerCase();
  if (n.includes("lunch") && n.includes("dinner")) return now.getHours() >= 16 ? "dinner" : "lunch";
  return mapMealPeriodNameToSlot(mealName);
}

/** Station names come in any case ("Hello Bowl", "street eats"). */
export function stationLabel(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

/**
 * A meal's name for the location switch. An all-day "Lunch / dinner" is
 * shown as whichever it is now, so the label fits.
 */
export function mealLabel(mealName: string, now: Date = new Date()): string {
  const n = (mealName ?? "").toLowerCase();
  if (n.includes("lunch") && n.includes("dinner")) return mealSlotFor(mealName, now) === "dinner" ? "Dinner" : "Lunch";
  return mealName;
}
