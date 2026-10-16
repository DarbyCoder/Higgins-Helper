/**
 * @file src/utils/restaurants.ts
 * @description Helpers for the Menu tab's Worcester side.
 *
 * Restaurant data is converted into the same DiningLocation / MenuItem shapes
 * the Clark menu uses, so LocationCard, NutritionModal and the food log work
 * on it unchanged.
 */
import type {
  DiningLocation,
  MenuItem,
  NutritionFact,
  OpeningHours,
  Restaurant,
  RestaurantItem,
  Weekday,
} from "@/types";
import { CLARK_CENTER } from "@/data/worcesterRestaurants";
import { filterByDietary } from "@/utils/dietary";
import { findActiveMealPeriod, parseTimeToMinutes } from "@/utils/time";

// ─── Hours ────────────────────────────────────────────────────────────────────

/**
 * LocationCard assumes every window closes after it opens, so a close past
 * midnight is capped here. Between midnight and the real close the place
 * shows as closed.
 */
const LATEST_CLOSE = "11:59 pm";

/** Weekday of a "YYYY-MM-DD" date, read at local noon so DST can't shift it. */
export function weekdayOf(date: string): Weekday {
  return new Date(`${date}T12:00:00`).getDay() as Weekday;
}

/** A restaurant's opening windows on a date, with late closes capped. */
export function hoursForDate(restaurant: Restaurant, date: string): OpeningHours[] {
  return restaurant.hours[weekdayOf(date)].map((window) => {
    const open  = parseTimeToMinutes(window.open);
    const close = parseTimeToMinutes(window.close);
    return open !== null && close !== null && close <= open
      ? { ...window, close: LATEST_CLOSE }
      : window;
  });
}

/** True if right now falls inside one of the restaurant's windows on `date`. */
export function isRestaurantOpenNow(restaurant: Restaurant, date: string, now = new Date()): boolean {
  const windows = hoursForDate(restaurant, date).map((w) => ({ startTime: w.open, endTime: w.close }));
  return findActiveMealPeriod(windows, now) !== undefined;
}

/**
 * Meal name for the current time of day. Restaurant hours aren't named after
 * meals the way Higgins periods are, so this is passed to NutritionModal as
 * its sourceMealName to preselect the log's meal slot.
 */
export function mealNameForNow(now = new Date()): string {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < 5 * 60)       return "Snack";
  if (mins < 10 * 60 + 30) return "Breakfast";
  if (mins < 16 * 60)      return "Lunch";
  if (mins < 21 * 60)      return "Dinner";
  return "Snack";
}

// ─── Conversion to Clark Menu Shapes ──────────────────────────────────────────

/** FDA daily values behind the nutrition label's % column. */
const DAILY_VALUE = { totalFat: 78, sodium: 2300, totalCarbs: 275, fiber: 28 };

const percentOf = (value: number, dailyValue: number) => Math.round((value / dailyValue) * 100);

/** Rows for NutritionModal's label, using the scraper's label names. */
function buildFacts(item: RestaurantItem): NutritionFact[] {
  return [
    { label: "Calories",           unit: "",   value: item.calories,   percentDrv: null },
    { label: "Total Fat",          unit: "g",  value: item.totalFat,   percentDrv: percentOf(item.totalFat, DAILY_VALUE.totalFat) },
    { label: "Sodium",             unit: "mg", value: item.sodium,     percentDrv: percentOf(item.sodium, DAILY_VALUE.sodium) },
    { label: "Total Carbohydrate", unit: "g",  value: item.totalCarbs, percentDrv: percentOf(item.totalCarbs, DAILY_VALUE.totalCarbs) },
    { label: "Dietary Fiber",      unit: "g",  value: item.fiber,      percentDrv: percentOf(item.fiber, DAILY_VALUE.fiber), isSecondary: true },
    { label: "Protein",            unit: "g",  value: item.protein,    percentDrv: null },
  ];
}

/** Converts a restaurant item to a MenuItem the Clark menu components understand. */
export function toMenuItem(restaurant: Restaurant, item: RestaurantItem): MenuItem {
  return {
    id:              `wor-${restaurant.slug}-${item.id}`,
    name:            item.name,
    description:     item.description ?? "",
    servingSize:     item.servingSize,
    calories:        item.calories,
    protein:         item.protein,
    totalFat:        item.totalFat,
    totalCarbs:      item.totalCarbs,
    sodium:          item.sodium,
    fiber:           item.fiber,
    facts:           buildFacts(item),
    attributes:      (item.attributes ?? []).map((icon) => ({ icon, name: icon })),
    ingredientsList: "",
    allergensList:   "",
    disclaimer:      "",
    isEstimate:      restaurant.nutritionSource === "estimated",
  };
}

/**
 * Converts a restaurant to a DiningLocation for LocationCard. Each opening
 * window on the date becomes a meal period sharing the same menu sections, so
 * split lunch/dinner hours show as tabs just like Higgins meal periods. A day
 * with no windows keeps the menu browsable under a "Closed" badge.
 */
export function restaurantToLocation(restaurant: Restaurant, date: string): DiningLocation {
  const stations = restaurant.sections.map((section) => ({
    id:    `${restaurant.slug}-${section.id}`,
    name:  section.name,
    items: section.items.map((item) => toMenuItem(restaurant, item)),
  }));
  const windows = hoursForDate(restaurant, date);

  return {
    slug:   restaurant.slug,
    name:   restaurant.name,
    url:    restaurant.menuUrl ?? "",
    isOpen: windows.length > 0,
    meals:  windows.length > 0
      ? windows.map((w) => ({ name: w.label ?? "Hours", startTime: w.open, endTime: w.close, stations }))
      : [{ name: "Closed today", startTime: "", endTime: "", stations }],
  };
}

// ─── Search & Distance ────────────────────────────────────────────────────────

/**
 * True if any menu item matches the Menu tab's search text and dietary chips.
 * Uses the same item-name rule as LocationCard, so a restaurant that matches
 * never opens to an empty menu.
 */
export function restaurantMatches(restaurant: Restaurant, query: string, dietaryFilters: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q && dietaryFilters.length === 0) return true;

  const items = restaurant.sections.flatMap((s) => s.items.map((item) => toMenuItem(restaurant, item)));
  const named = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  return filterByDietary(named, dietaryFilters).length > 0;
}

const EARTH_RADIUS_MILES = 3958.8;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance in miles from Higgins to the restaurant. */
export function distanceFromClark(restaurant: Restaurant): number {
  const dLat = toRadians(restaurant.lat - CLARK_CENTER.lat);
  const dLng = toRadians(restaurant.lng - CLARK_CENTER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(CLARK_CENTER.lat)) * Math.cos(toRadians(restaurant.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

/** "0.3 mi · 8 min walk" within walking range, otherwise just "2.4 mi". */
export function formatDistance(miles: number): string {
  const rounded = miles < 0.1 ? "<0.1" : miles.toFixed(1);
  if (miles > 1.5) return `${rounded} mi`;
  // ~20 min per mile, plus a quarter for streets that don't run straight there
  const walkMins = Math.max(1, Math.round(miles * 1.25 * 20));
  return `${rounded} mi · ${walkMins} min walk`;
}
