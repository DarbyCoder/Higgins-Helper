/**
 * @file src/utils/mains.ts
 * @description Picks the dishes that can be the centre of a meal (a burger,
 * a bowl, pizza, a sandwich) out of a dining hall meal, which also lists every
 * topping, dressing, bread and dessert as its own item.
 *
 * The Menu tab lists these, biggest first. Everything else is a search away.
 */
import type { MealPeriod, MenuItem } from "@/types";
import type { MealSlot } from "@/types";
import { filterByDietary } from "@/utils/dietary";
import { mapMealPeriodNameToSlot } from "@/utils/time";

/** "High protein" chip: at least this many grams. */
export const HIGH_PROTEIN_G = 20;

/**
 * Stations of parts rather than dishes: toppings and dressings, breads, fruit,
 * desserts, sides, drinks, build-your-own counters, and the deli (its egg and
 * tuna salads are sandwich fillings).
 */
const PART_STATIONS =
  /topping|dressing|green|fruit|yogurt|bread|spread|waffle|dessert|hummus|side|smoothie|hello bowl|condiment|beverage|drink|cereal|chobani|^byo\b|build your own|soup &/i;

/** Dishes that are sides, sauces, breads or sweets wherever they're served. */
const PART_NAMES =
  /fries|tots\b|chips|\bbread\b|bagel|\bbuns?\b|tortilla|croissant|muffin|dressing|sauce|mayo|queso|\bdip\b|cookie|brownie|cake|ice cream|syrup|\bbutter\b|spread|granola/i;

/** Big enough to build a meal around: 300 cal, or 200 cal with 12 g protein. */
function isMain(item: MenuItem, stationName: string): boolean {
  if (PART_STATIONS.test(stationName) || PART_NAMES.test(item.name ?? "")) return false;
  const cal = num(item.calories);
  return cal >= 300 || (cal >= 200 && num(item.protein) >= 12);
}

export const num = (n: number) => (Number.isFinite(n) ? n : 0);

export interface Dish {
  item: MenuItem;
  station: string;
}

export interface MainsFilter {
  diets: string[];
  highProtein: boolean;
  /** Only dishes within this many calories; null for no limit. */
  maxCalories: number | null;
}

/** The meal's main dishes that pass `filter`, biggest first, each name once. */
export function pickMains(meal: MealPeriod | undefined, filter: MainsFilter): Dish[] {
  if (!meal) return [];
  const seen = new Set<string>();
  const out: Dish[] = [];
  for (const station of meal.stations ?? []) {
    let items = (station.items ?? []).filter((i) => isMain(i, station.name ?? ""));
    items = filterByDietary(items, filter.diets);
    for (const item of items) {
      const key = (item.name ?? "").toLowerCase();
      if (seen.has(key)) continue;
      if (filter.highProtein && num(item.protein) < HIGH_PROTEIN_G) continue;
      if (filter.maxCalories !== null && num(item.calories) > filter.maxCalories) continue;
      seen.add(key);
      out.push({ item, station: station.name ?? "" });
    }
  }
  return out.sort((a, b) => num(b.item.calories) - num(a.item.calories));
}

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
