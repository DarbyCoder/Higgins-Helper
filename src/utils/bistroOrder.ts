/**
 * @file src/utils/bistroOrder.ts
 * @description Turns the text of a Bistro order screenshot (Grubhub's "Your
 * pickup order" or "Review your pickup order" screen, read by OCR) into
 * dishes, and matches each dish's components to that day's Bistro menu.
 *
 * Both screens list the order the same way: a dish name, then its components.
 *   Review screen: "1 Rice Bowl   1M" then components separated by commas,
 *                  wrapped over several lines.
 *   Order screen:  "Rice Bowl  🗑 1 +" then one component per line, then the
 *                  dish's price ("$0.00").
 */
import type { DailyMenuResponse, MenuItem } from "@/types";

export interface ParsedDish {
  name:       string;
  quantity:   number;
  components: string[];
}

export interface MatchedComponent {
  text: string;
  /** The menu item it matched, or null if today's Bistro menu has no match. */
  item: MenuItem | null;
}

export interface MatchedDish {
  name:       string;
  quantity:   number;
  components: MatchedComponent[];
  /** The dish's own menu item ("Cheeseburger"), or null for build-your-own dishes. */
  dishItem:   MenuItem | null;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/** "1M" is one meal swipe; OCR sometimes reads the 1 as i, I or l. */
const PRICE = String.raw`(?:[0-9iIl]+\s*M|\$\s?\d+[.,]\d{2})`;
const START_LINE = /^(your order|items:\s*\d+)$/i;
const END_LINE = /subtotal|^total\b|sales tax|place your|continue to checkout/i;
const PRICE_LINE = new RegExp(`^${PRICE}$`);
/** Review screen dish line: quantity, name, price ("1Rice Bowl 1M"). */
const QTY_NAME_PRICE = new RegExp(`^(\\d+)\\s*x?\\s*([A-Za-z].*?)\\s+${PRICE}$`);
/** Order screen dish line: name, trash icon read as a stray mark, quantity, "+". */
const NAME_STEPPER = /^(.*?[A-Za-z].*?)(?:\s+\S{1,2})?\s+(\d+)\s*\+?$/;
/** Lines that add no food: packaging, and removals like "No Pickles". */
const NOT_FOOD = /\bto go\b|reusable container|utensil|napkin|\bbag\b|^(no|without)\s/i;

/** Parses OCR text from a Bistro order screenshot. */
export function parseBistroOrder(text: string): ParsedDish[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Keep only the order section: after "Your order" / "Items: N", up to the totals
  let start = lines.findIndex((l) => START_LINE.test(l));
  if (start === -1) start = lines.findIndex((l) => /bistro meal swipe/i.test(l));
  let section = lines.slice(start + 1);
  const end = section.findIndex((l) => END_LINE.test(l));
  if (end !== -1) section = section.slice(0, end);

  const blocks: { header: string; quantity: number; body: string[] }[] = [];
  let current: (typeof blocks)[number] | null = null;
  for (const line of section) {
    const qtyFirst = line.match(QTY_NAME_PRICE);
    if (qtyFirst) {
      current = { header: qtyFirst[2]!, quantity: Number(qtyFirst[1]), body: [] };
      blocks.push(current);
    } else if (PRICE_LINE.test(line)) {
      current = null; // a dish's price closes it on the order screen
    } else if (!current) {
      const stepper = line.match(NAME_STEPPER);
      current = stepper
        ? { header: stepper[1]!, quantity: Number(stepper[2]), body: [] }
        : { header: line, quantity: 1, body: [] };
      blocks.push(current);
    } else {
      current.body.push(line);
    }
  }

  return blocks.map(({ header, quantity, body }) => {
    // Comma-separated components wrap across lines, so join before splitting
    const parts = body.some((l) => l.includes(","))
      ? body.join(" ").split(",")
      : body;
    return {
      name: header.trim(),
      quantity: Math.max(1, quantity || 1),
      components: parts.map((p) => p.trim()).filter((p) => p && !NOT_FOOD.test(p)),
    };
  });
}

// ─── Matching ─────────────────────────────────────────────────────────────────

const STOPWORDS = new Set(["and", "with", "the", "of", "a", "oz", "floz", "cup", "cups", "each", "slice"]);

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

/** Share of words two names have in common (0–1). */
function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

const MIN_SIMILARITY = 0.6;

function bestMatch(name: string, items: MenuItem[]): MenuItem | null {
  let best: MenuItem | null = null;
  let bestScore = MIN_SIMILARITY;
  for (const item of items) {
    const score = similarity(name, item.name);
    if (score > bestScore || (score === bestScore && best === null)) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

/** Every item The Bistro serves on a day, one per name. */
export function bistroItems(menu: DailyMenuResponse): MenuItem[] {
  const bistro = menu.locations.find((l) => /bistro/i.test(l.name));
  const byName = new Map<string, MenuItem>();
  for (const meal of bistro?.meals ?? []) {
    for (const station of meal.stations) {
      for (const item of station.items) {
        if (!byName.has(item.name)) byName.set(item.name, item);
      }
    }
  }
  return [...byName.values()];
}

export function matchBistroOrder(dishes: ParsedDish[], items: MenuItem[]): MatchedDish[] {
  return dishes.map((dish) => ({
    name: dish.name,
    quantity: dish.quantity,
    components: dish.components.map((text) => ({ text, item: bestMatch(text, items) })),
    dishItem: bestMatch(dish.name, items),
  }));
}

/**
 * The menu item to log for a dish: the dish's own menu item if it has one,
 * plus every matched component (a build-your-own dish like "Rice Bowl" is just
 * its components). Null if nothing matched.
 */
export function dishToMenuItem(dish: MatchedDish): MenuItem | null {
  const extras = dish.components.flatMap((c) => (c.item ? [c.item] : []));
  if (extras.length === 0) return dish.dishItem;
  const parts = dish.dishItem ? [dish.dishItem, ...extras] : extras;

  const sum = (key: "calories" | "protein" | "totalFat" | "totalCarbs" | "sodium" | "fiber") =>
    Number(parts.reduce((total, p) => total + p[key], 0).toFixed(1));
  return {
    id:            `bistro-order-${dish.name.toLowerCase().replace(/\W+/g, "-")}`,
    name:          dish.name,
    description:   parts.map((p) => p.name).join(", "),
    servingSize:   "1 order",
    calories:      Math.round(sum("calories")),
    protein:       sum("protein"),
    totalFat:      sum("totalFat"),
    totalCarbs:    sum("totalCarbs"),
    sodium:        Math.round(sum("sodium")),
    fiber:         sum("fiber"),
    facts:         [],
    attributes:    [],
    allergensList: "",
    ingredientsList: "",
    disclaimer:    "",
  };
}
