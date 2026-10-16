/**
 * @file src/data/worcesterRestaurants.ts
 * @description Hand-curated restaurants near Clark for the Menu tab's
 * Worcester side. Edit this file to add a place or update a menu; changes go
 * live with the next deploy.
 *
 * NUTRITION
 *   - nutritionSource "official": numbers copied from the chain's own
 *     published nutrition data (see each restaurant's `sources`). Chipotle and
 *     Island Fin "builds" are sums of the chain's standard portions.
 *   - nutritionSource "estimated": our estimates for a typical portion, built
 *     up from standard ingredient values (USDA-style references). Each item's
 *     servingSize says what portion we assumed. These show with a "~".
 *
 * HOURS use the "h:mm am/pm" format the Clark menu uses. A close earlier than
 * the open ("1:00 am") means after midnight.
 *
 * COORDINATES come from OpenStreetMap (© OpenStreetMap contributors).
 */
import type { OpeningHours, Restaurant, RestaurantArea, Weekday } from "@/types";

/** Higgins University Center — the map's campus marker and the distance origin. */
export const CLARK_CENTER = { lat: 42.250339, lng: -71.823215 };

/** Map areas in list order. `label` heads each list group; `shortLabel` is the map chip. */
export const RESTAURANT_AREAS: { id: RestaurantArea; label: string; shortLabel: string }[] = [
  { id: "main-st",      label: "Main St · by campus",              shortLabel: "Main St" },
  { id: "park-ave",     label: "Park Ave",                         shortLabel: "Park Ave" },
  { id: "trolley-yard", label: "Trolley Yard · Park Ave & Grove St", shortLabel: "Trolley Yard" },
];

// ─── Hours Helpers ────────────────────────────────────────────────────────────

/** One opening window, optionally named (named windows show as tabs). */
function open(from: string, to: string, label?: string): OpeningHours[] {
  return [{ open: from, close: to, ...(label ? { label } : {}) }];
}

/** The same windows every day of the week. */
function everyDay(windows: OpeningHours[]): Record<Weekday, OpeningHours[]> {
  return { 0: windows, 1: windows, 2: windows, 3: windows, 4: windows, 5: windows, 6: windows };
}

/** Per-day windows (0 = Sunday … 6 = Saturday); days left out are closed. */
function week(days: Partial<Record<Weekday, OpeningHours[]>>): Record<Weekday, OpeningHours[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], ...days };
}

// ─── Restaurants ──────────────────────────────────────────────────────────────

export const WORCESTER_RESTAURANTS: Restaurant[] = [
  // ══ Main St · by campus ═══════════════════════════════════════════════════

  {
    slug: "dunkin-main-st",
    name: "Dunkin'",
    cuisine: "Coffee & donuts",
    area: "main-st",
    address: "845 Main St, Worcester, MA 01610",
    lat: 42.253967,
    lng: -71.814648,
    menuUrl: "https://www.dunkindonuts.com/en/menu",
    hours: week({
      0: open("5:00 am", "8:00 pm"),
      1: open("4:30 am", "8:00 pm"), 2: open("4:30 am", "8:00 pm"), 3: open("4:30 am", "8:00 pm"),
      4: open("4:30 am", "8:00 pm"), 5: open("4:30 am", "8:00 pm"), 6: open("4:30 am", "8:00 pm"),
    }),
    nutritionSource: "official",
    sources: ["Dunkin' Nutrition Guide (updated 09-21-2026)", "Hours: OpenStreetMap"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "sandwiches",
        name: "Breakfast Sandwiches",
        items: [
          { id: "bec-croissant", name: "Bacon, Egg & Cheese on Croissant", servingSize: "1 sandwich", calories: 520, protein: 19, totalFat: 34, totalCarbs: 34, sodium: 870, fiber: 1 },
          { id: "bec-english-muffin", name: "Bacon, Egg & Cheese on English Muffin", servingSize: "1 sandwich", calories: 420, protein: 19, totalFat: 21, totalCarbs: 39, sodium: 900, fiber: 1 },
          { id: "sec-english-muffin", name: "Sausage, Egg & Cheese on English Muffin", servingSize: "1 sandwich", calories: 560, protein: 21, totalFat: 35, totalCarbs: 40, sodium: 1140, fiber: 2 },
          { id: "ec-english-muffin", name: "Egg & Cheese on English Muffin", servingSize: "1 sandwich", calories: 340, protein: 14, totalFat: 15, totalCarbs: 38, sodium: 650, fiber: 1, attributes: ["vegetarian"] },
          { id: "sourdough-breakfast", name: "Sourdough Breakfast Sandwich", servingSize: "1 sandwich", calories: 630, protein: 30, totalFat: 31, totalCarbs: 58, sodium: 1300, fiber: 3 },
          { id: "bec-wrap", name: "Bacon, Egg & Cheese Wake-Up Wrap", servingSize: "1 wrap", calories: 220, protein: 10, totalFat: 13, totalCarbs: 15, sodium: 590, fiber: 0 },
          { id: "sec-wrap", name: "Sausage, Egg & Cheese Wake-Up Wrap", servingSize: "1 wrap", calories: 280, protein: 10, totalFat: 20, totalCarbs: 15, sodium: 690, fiber: 1 },
          { id: "avocado-toast", name: "Avocado Toast", servingSize: "1 piece", calories: 240, protein: 6, totalFat: 11, totalCarbs: 34, sodium: 530, fiber: 6, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "bagels-sides",
        name: "Bagels & Sides",
        items: [
          { id: "hash-browns", name: "Hash Browns", servingSize: "6 pieces", calories: 110, protein: 1, totalFat: 6, totalCarbs: 13, sodium: 360, fiber: 1 },
          { id: "snackin-bacon", name: "Maple Brown Sugar Snackin' Bacon", servingSize: "8 pieces", calories: 190, protein: 10, totalFat: 12, totalCarbs: 10, sodium: 500, fiber: 0 },
          { id: "plain-bagel", name: "Plain Bagel", servingSize: "1 bagel", calories: 300, protein: 11, totalFat: 1, totalCarbs: 64, sodium: 620, fiber: 4, attributes: ["vegetarian"] },
          { id: "everything-bagel", name: "Everything Bagel", servingSize: "1 bagel", calories: 340, protein: 12, totalFat: 3, totalCarbs: 67, sodium: 630, fiber: 5, attributes: ["vegetarian"] },
          { id: "cream-cheese", name: "Plain Cream Cheese", servingSize: "1 portion", calories: 120, protein: 2, totalFat: 12, totalCarbs: 3, sodium: 200, fiber: 0, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "donuts-bakery",
        name: "Donuts & Bakery",
        items: [
          { id: "glazed", name: "Glazed Donut", servingSize: "1 donut", calories: 240, protein: 4, totalFat: 11, totalCarbs: 33, sodium: 270, fiber: 1 },
          { id: "boston-kreme", name: "Boston Kreme Donut", servingSize: "1 donut", calories: 270, protein: 5, totalFat: 11, totalCarbs: 39, sodium: 320, fiber: 1 },
          { id: "chocolate-frosted", name: "Chocolate Frosted Donut", servingSize: "1 donut", calories: 260, protein: 4, totalFat: 11, totalCarbs: 34, sodium: 290, fiber: 1 },
          { id: "strawberry-sprinkles", name: "Strawberry Frosted with Sprinkles", servingSize: "1 donut", calories: 270, protein: 4, totalFat: 12, totalCarbs: 37, sodium: 280, fiber: 1 },
          { id: "jelly", name: "Jelly Donut", servingSize: "1 donut", calories: 250, protein: 4, totalFat: 10, totalCarbs: 36, sodium: 290, fiber: 1 },
          { id: "glazed-munchkin", name: "Glazed Munchkins", servingSize: "1 donut hole", calories: 60, protein: 1, totalFat: 3, totalCarbs: 7, sodium: 60, fiber: 0 },
          { id: "blueberry-muffin", name: "Blueberry Muffin", servingSize: "1 muffin", calories: 460, protein: 6, totalFat: 15, totalCarbs: 77, sodium: 390, fiber: 1 },
          { id: "coffee-roll", name: "Coffee Roll", servingSize: "1 roll", calories: 390, protein: 7, totalFat: 19, totalCarbs: 48, sodium: 440, fiber: 2 },
        ],
      },
      {
        id: "drinks",
        name: "Coffee & Drinks",
        items: [
          { id: "hot-coffee", name: "Hot Coffee, Black", servingSize: "Medium", calories: 5, protein: 1, totalFat: 0, totalCarbs: 0, sodium: 10, fiber: 0, attributes: ["vegan", "vegetarian"] },
          { id: "hot-coffee-cream-sugar", name: "Hot Coffee with Cream & Sugar", servingSize: "Medium", calories: 190, protein: 2, totalFat: 9, totalCarbs: 27, sodium: 40, fiber: 0, attributes: ["vegetarian"] },
          { id: "iced-coffee", name: "Iced Coffee, Black", servingSize: "Medium", calories: 5, protein: 0, totalFat: 0, totalCarbs: 0, sodium: 15, fiber: 0, attributes: ["vegan", "vegetarian"] },
          { id: "iced-coffee-cream-sugar", name: "Iced Coffee with Cream & Sugar", servingSize: "Medium", calories: 190, protein: 2, totalFat: 9, totalCarbs: 27, sodium: 45, fiber: 0, attributes: ["vegetarian"] },
          { id: "iced-latte", name: "Iced Latte with Whole Milk", servingSize: "Medium", calories: 170, protein: 9, totalFat: 9, totalCarbs: 14, sodium: 135, fiber: 0, attributes: ["vegetarian"] },
          { id: "hot-chocolate", name: "Hot Chocolate", servingSize: "Medium", calories: 330, protein: 3, totalFat: 10, totalCarbs: 59, sodium: 320, fiber: 2, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "mcdonalds-main-st",
    name: "McDonald's",
    cuisine: "Burgers & fries",
    area: "main-st",
    address: "995 Main St, Worcester, MA 01603",
    lat: 42.247722,
    lng: -71.826119,
    menuUrl: "https://www.mcdonalds.com/us/en-us/full-menu.html",
    hours: everyDay(open("5:00 am", "11:00 pm")),
    nutritionSource: "official",
    sources: ["mcdonalds.com nutrition data (Oct 2026)", "Hours: OpenStreetMap"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "burgers",
        name: "Burgers",
        items: [
          { id: "big-mac", name: "Big Mac", servingSize: "1 sandwich", calories: 580, protein: 25, totalFat: 34, totalCarbs: 45, sodium: 1060, fiber: 3 },
          { id: "qpc", name: "Quarter Pounder with Cheese", servingSize: "1 sandwich", calories: 520, protein: 30, totalFat: 26, totalCarbs: 42, sodium: 1140, fiber: 2 },
          { id: "mcdouble", name: "McDouble", servingSize: "1 sandwich", calories: 390, protein: 22, totalFat: 20, totalCarbs: 32, sodium: 920, fiber: 2 },
          { id: "cheeseburger", name: "Cheeseburger", servingSize: "1 sandwich", calories: 300, protein: 15, totalFat: 13, totalCarbs: 31, sodium: 720, fiber: 2 },
        ],
      },
      {
        id: "chicken-fish",
        name: "Chicken & Fish",
        items: [
          { id: "mcchicken", name: "McChicken", servingSize: "1 sandwich", calories: 390, protein: 14, totalFat: 21, totalCarbs: 38, sodium: 560, fiber: 1 },
          { id: "mccrispy", name: "McCrispy", servingSize: "1 sandwich", calories: 470, protein: 26, totalFat: 20, totalCarbs: 46, sodium: 1140, fiber: 1 },
          { id: "nuggets-10", name: "Chicken McNuggets", servingSize: "10 pieces", calories: 410, protein: 23, totalFat: 24, totalCarbs: 26, sodium: 850, fiber: 1 },
          { id: "filet-o-fish", name: "Filet-O-Fish", servingSize: "1 sandwich", calories: 380, protein: 16, totalFat: 19, totalCarbs: 38, sodium: 580, fiber: 1 },
        ],
      },
      {
        id: "breakfast",
        name: "Breakfast",
        items: [
          { id: "egg-mcmuffin", name: "Egg McMuffin", servingSize: "1 sandwich", calories: 310, protein: 17, totalFat: 13, totalCarbs: 30, sodium: 770, fiber: 2 },
          { id: "sausage-mcmuffin-egg", name: "Sausage McMuffin with Egg", servingSize: "1 sandwich", calories: 480, protein: 20, totalFat: 31, totalCarbs: 30, sodium: 830, fiber: 2 },
          { id: "hash-browns", name: "Hash Browns", servingSize: "1 hash brown", calories: 140, protein: 2, totalFat: 8, totalCarbs: 18, sodium: 310, fiber: 2 },
          { id: "hotcakes", name: "Hotcakes", servingSize: "1 order (3 hotcakes)", calories: 580, protein: 9, totalFat: 15, totalCarbs: 101, sodium: 530, fiber: 2 },
          { id: "sausage-burrito", name: "Sausage Burrito", servingSize: "1 burrito", calories: 310, protein: 13, totalFat: 17, totalCarbs: 25, sodium: 800, fiber: 1 },
        ],
      },
      {
        id: "fries-sweets-drinks",
        name: "Fries, Sweets & Drinks",
        items: [
          { id: "medium-fries", name: "French Fries", servingSize: "Medium", calories: 320, protein: 5, totalFat: 15, totalCarbs: 43, sodium: 260, fiber: 4 },
          { id: "oreo-mcflurry", name: "McFlurry with OREO Cookies", servingSize: "Regular", calories: 410, protein: 10, totalFat: 13, totalCarbs: 64, sodium: 210, fiber: 1, attributes: ["vegetarian"] },
          { id: "apple-pie", name: "Baked Apple Pie", servingSize: "1 pie", calories: 230, protein: 2, totalFat: 11, totalCarbs: 33, sodium: 100, fiber: 1 },
          { id: "iced-coffee", name: "Iced Coffee", servingSize: "Small", calories: 150, protein: 1, totalFat: 5, totalCarbs: 25, sodium: 35, fiber: 0, attributes: ["vegetarian"] },
          { id: "coke-medium", name: "Coca-Cola", servingSize: "Medium, no ice", calories: 270, protein: 0, totalFat: 0, totalCarbs: 70, sodium: 65, fiber: 0, attributes: ["vegan", "vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "belens-clark-brunch",
    name: "Belén's Clark Brunch",
    cuisine: "Diner & Salvadoran brunch",
    area: "main-st",
    address: "934 Main St, Worcester, MA 01610",
    lat: 42.251045,
    lng: -71.821205,
    hours: week({
      0: open("7:00 am", "3:00 pm"), 2: open("7:00 am", "3:00 pm"), 3: open("7:00 am", "3:00 pm"),
      4: open("7:00 am", "3:00 pm"), 5: open("7:00 am", "3:00 pm"), 6: open("7:00 am", "3:00 pm"),
    }),
    nutritionSource: "estimated",
    sources: [
      "Clark News, Apr 23 2026: opening, hours and the named specials",
      "Other plates are standard diner and Salvadoran breakfast dishes; check the menu board",
    ],
    lastVerified: "2026-10",
    sections: [
      {
        id: "specials",
        name: "House Specials",
        items: [
          { id: "annies-special", name: "Annie's Special", description: "Two eggs, bacon or sausage, home fries and toast", servingSize: "1 plate: 2 eggs, 3 strips bacon, home fries, 2 slices buttered toast (est.)", calories: 810, protein: 30, totalFat: 46, totalCarbs: 63, sodium: 1430, fiber: 5 },
          { id: "beckys-special", name: "Becky's Special", description: "Three chocolate & peanut butter chip pancakes with strawberries, bananas and whipped cream", servingSize: "1 plate, with butter & ¼ cup syrup (est.)", calories: 1200, protein: 19, totalFat: 44, totalCarbs: 182, sodium: 1180, fiber: 7 },
          { id: "joses-big-breakfast", name: "José's Big Breakfast", description: "6 oz steak, two eggs, home fries or casamiento, chimol, toast or tortillas", servingSize: "1 plate with home fries & 2 corn tortillas (est.)", calories: 960, protein: 63, totalFat: 51, totalCarbs: 59, sodium: 1220, fiber: 7 },
        ],
      },
      {
        id: "salvadoran",
        name: "Salvadoran",
        items: [
          { id: "pupusa-queso", name: "Cheese Pupusa", description: "With curtido and salsa", servingSize: "1 pupusa (est.)", calories: 310, protein: 11, totalFat: 13, totalCarbs: 37, sodium: 520, fiber: 4, attributes: ["vegetarian"] },
          { id: "pupusa-revuelta", name: "Pupusa Revuelta", description: "Pork, bean and cheese, with curtido", servingSize: "1 pupusa (est.)", calories: 340, protein: 14, totalFat: 15, totalCarbs: 38, sodium: 600, fiber: 5 },
          { id: "tamal-pollo", name: "Chicken Tamal", servingSize: "1 tamal (est.)", calories: 330, protein: 13, totalFat: 16, totalCarbs: 33, sodium: 600, fiber: 3 },
          { id: "casamiento", name: "Casamiento", description: "Rice and beans", servingSize: "1 cup side (est.)", calories: 280, protein: 9, totalFat: 7, totalCarbs: 45, sodium: 450, fiber: 7, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "diner",
        name: "Diner Classics",
        items: [
          { id: "pancakes", name: "Pancakes", servingSize: "3 pancakes with butter & ¼ cup syrup (est.)", calories: 820, protein: 15, totalFat: 26, totalCarbs: 132, sodium: 1120, fiber: 3, attributes: ["vegetarian"] },
          { id: "french-toast", name: "French Toast", servingSize: "3 slices with butter & ¼ cup syrup (est.)", calories: 850, protein: 18, totalFat: 35, totalCarbs: 117, sodium: 870, fiber: 3, attributes: ["vegetarian"] },
          { id: "veggie-omelet", name: "Veggie Omelet", description: "With home fries and toast", servingSize: "3-egg omelet with cheese, home fries, 2 slices toast (est.)", calories: 920, protein: 35, totalFat: 52, totalCarbs: 70, sodium: 1220, fiber: 7, attributes: ["vegetarian"] },
          { id: "breakfast-sandwich", name: "Bacon, Egg & Cheese Sandwich", servingSize: "1 sandwich on a roll (est.)", calories: 450, protein: 23, totalFat: 23, totalCarbs: 38, sodium: 1080, fiber: 2 },
          { id: "home-fries", name: "Home Fries", servingSize: "1 cup side (est.)", calories: 250, protein: 3, totalFat: 12, totalCarbs: 32, sodium: 400, fiber: 3, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "belen-casa-de-pan",
    name: "Belén Casa de Pan",
    cuisine: "Salvadoran bakery & café",
    area: "main-st",
    address: "932A Main St, Worcester, MA 01610",
    lat: 42.251081,
    lng: -71.820948,
    menuUrl: "https://www.belensbakery.com/",
    hours: week({
      1: open("8:00 am", "5:00 pm"), 2: open("8:00 am", "5:00 pm"), 3: open("8:00 am", "5:00 pm"),
      4: open("8:00 am", "5:00 pm"), 5: open("8:00 am", "5:00 pm"), 6: open("9:00 am", "4:00 pm"),
    }),
    nutritionSource: "estimated",
    sources: ["belensbakery.com & Yelp (hours, Sep 2026)", "Toast online menu (items)"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "breakfast-sandwiches",
        name: "Breakfast & Sandwiches",
        items: [
          { id: "guanaco", name: "Guanaco", description: "Scrambled eggs, avocado, refried beans and Salvadoran crema on a sub roll", servingSize: "1 sub (est.)", calories: 760, protein: 32, totalFat: 36, totalCarbs: 80, sodium: 1210, fiber: 11, attributes: ["vegetarian"] },
          { id: "ranchero", name: "Ranchero", description: "Sunny-side-up egg, ranchera tomato sauce and refried beans on a bulkie roll", servingSize: "1 sandwich (est.)", calories: 480, protein: 22, totalFat: 15, totalCarbs: 69, sodium: 1180, fiber: 9, attributes: ["vegetarian"] },
          { id: "avocado-toast", name: "Avocado Toast", description: "Whole grain toast with avocado", servingSize: "2 slices, ½ avocado, no extra toppings (est.)", calories: 375, protein: 12, totalFat: 18, totalCarbs: 44, sodium: 540, fiber: 11, attributes: ["vegan", "vegetarian"] },
          { id: "salvi-chicken-salad", name: "Salvi Chicken Salad Sandwich", description: "Salvadoran chicken salad and slaw on sandwich bread", servingSize: "1 sandwich (est.)", calories: 460, protein: 24, totalFat: 21, totalCarbs: 41, sodium: 850, fiber: 4 },
          { id: "turkey-bacon", name: "Turkey & Bacon Sub", description: "Turkey and bacon with lettuce and tomato on a sub roll", servingSize: "1 sub (est.)", calories: 510, protein: 37, totalFat: 13, totalCarbs: 60, sodium: 1860, fiber: 3 },
          { id: "pupusa", name: "Cheese Pupusa", servingSize: "1 pupusa (est.)", calories: 310, protein: 11, totalFat: 13, totalCarbs: 37, sodium: 520, fiber: 4, attributes: ["vegetarian"] },
          { id: "platanos", name: "Plátanos Maduros", description: "Fried sweet plantains", servingSize: "1 plantain (est.)", calories: 340, protein: 2, totalFat: 14, totalCarbs: 58, sodium: 10, fiber: 4, attributes: ["vegan", "vegetarian"] },
        ],
      },
      {
        id: "pan-dulce",
        name: "Pan Dulce & Desserts",
        items: [
          { id: "quesadilla", name: "Quesadilla Salvadoreña", description: "Sweet cheese pound cake", servingSize: "1 piece, ~100 g (est.)", calories: 380, protein: 8, totalFat: 18, totalCarbs: 46, sodium: 330, fiber: 1, attributes: ["vegetarian"] },
          { id: "semita-alta", name: "Semita Alta", description: "Layered sweet bread with fruit filling", servingSize: "1 slice, ~120 g (est.)", calories: 420, protein: 7, totalFat: 12, totalCarbs: 72, sodium: 280, fiber: 2, attributes: ["vegetarian"] },
          { id: "pastelito-pina", name: "Pastelito de Piña", description: "Pineapple pastry", servingSize: "1 pastry (est.)", calories: 250, protein: 3, totalFat: 11, totalCarbs: 35, sodium: 150, fiber: 1, attributes: ["vegetarian"] },
          { id: "tres-leches", name: "Tres Leches", servingSize: "1 slice, ~150 g (est.)", calories: 400, protein: 9, totalFat: 16, totalCarbs: 56, sodium: 180, fiber: 0, attributes: ["vegetarian"] },
          { id: "choco-flan", name: "Choco Flan", servingSize: "1 slice, ~140 g (est.)", calories: 420, protein: 8, totalFat: 19, totalCarbs: 55, sodium: 300, fiber: 1, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "coffee",
        name: "Coffee",
        items: [
          { id: "coffee-milk-sugar", name: "Acoustic Java Coffee with Milk & Sugar", servingSize: "12 oz, 2 oz whole milk, 2 tsp sugar (est.)", calories: 75, protein: 2, totalFat: 2, totalCarbs: 11, sodium: 35, fiber: 0, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "saigon-restaurant",
    name: "Saigon Restaurant",
    cuisine: "Vietnamese",
    area: "main-st",
    address: "976B Main St, Worcester, MA 01603",
    lat: 42.249102,
    lng: -71.824558,
    hours: week({
      1: open("11:00 am", "9:00 pm"), 2: open("11:00 am", "9:00 pm"), 3: open("11:00 am", "9:00 pm"),
      4: open("11:00 am", "9:00 pm"), 5: open("11:00 am", "9:00 pm"), 6: open("11:00 am", "9:00 pm"),
    }),
    nutritionSource: "estimated",
    sources: ["Spinach.guide & RestaurantGuru (hours)", "Grubhub menu via Allmenus (items)"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "soups",
        name: "Pho & Soups",
        items: [
          { id: "pho", name: "Pho", description: "Beef rice noodle soup", servingSize: "1 large bowl (est.)", calories: 450, protein: 30, totalFat: 10, totalCarbs: 60, sodium: 1800, fiber: 2 },
          { id: "wonton-soup", name: "Wonton Soup", servingSize: "1 bowl (est.)", calories: 300, protein: 16, totalFat: 9, totalCarbs: 36, sodium: 1500, fiber: 2 },
        ],
      },
      {
        id: "noodles-rice",
        name: "Noodles & Rice",
        items: [
          { id: "cha-gio-noodle-salad", name: "Cha Gio Noodle Salad", description: "Vermicelli with egg rolls, herbs, peanuts and nuoc cham", servingSize: "1 bowl with 2 egg rolls (est.)", calories: 710, protein: 16, totalFat: 23, totalCarbs: 110, sodium: 1480, fiber: 6 },
          { id: "lemon-grass-chicken", name: "Lemon Grass Chicken", description: "With steamed rice", servingSize: "1 plate, 1½ cups rice (est.)", calories: 660, protein: 41, totalFat: 19, totalCarbs: 78, sodium: 910, fiber: 3 },
          { id: "curry-chicken", name: "Curry Chicken", description: "Coconut curry with potatoes, with steamed rice", servingSize: "1 plate, 1½ cups rice (est.)", calories: 760, protein: 36, totalFat: 27, totalCarbs: 90, sodium: 1010, fiber: 4 },
          { id: "fried-rice", name: "Fried Rice", description: "Chicken, BBQ pork, egg, snow peas and carrots", servingSize: "1 plate, ~2½ cups (est.)", calories: 750, protein: 35, totalFat: 25, totalCarbs: 95, sodium: 1500, fiber: 4 },
          { id: "chefs-chicken-delight", name: "Chef's Chicken Delight", description: "Stir-fried rice noodles with chicken, bean sprouts and vegetables in oyster sauce", servingSize: "1 plate (est.)", calories: 700, protein: 32, totalFat: 20, totalCarbs: 95, sodium: 1700, fiber: 4 },
        ],
      },
      {
        id: "sandwiches-apps",
        name: "Sandwiches & Appetizers",
        items: [
          { id: "bbq-pork-sandwich", name: "BBQ Pork Sandwich", description: "Bánh mì with pickled vegetables and cilantro", servingSize: "1 sandwich (est.)", calories: 630, protein: 30, totalFat: 21, totalCarbs: 78, sodium: 1390, fiber: 4 },
          { id: "grilled-chicken-sandwich", name: "Grilled Chicken Sandwich", description: "Bánh mì with pickled vegetables and cilantro", servingSize: "1 sandwich (est.)", calories: 600, protein: 36, totalFat: 18, totalCarbs: 73, sodium: 1290, fiber: 4 },
          { id: "tofu-mushroom-sandwich", name: "Tofu & Mushrooms Sandwich", description: "Bánh mì with pickled vegetables and cilantro", servingSize: "1 sandwich (est.)", calories: 670, protein: 29, totalFat: 26, totalCarbs: 78, sodium: 1290, fiber: 6, attributes: ["vegetarian"] },
          { id: "cha-gio", name: "Classic Cha Gio", description: "Fried egg rolls with dipping sauce", servingSize: "2 egg rolls (est.)", calories: 270, protein: 8, totalFat: 13, totalCarbs: 30, sodium: 850, fiber: 1 },
          { id: "tofu-salad-rolls", name: "Fresh Salad Rolls with Tofu", description: "With peanut sauce", servingSize: "2 rolls (est.)", calories: 350, protein: 13, totalFat: 10, totalCarbs: 51, sodium: 700, fiber: 3, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "drinks",
        name: "Drinks",
        items: [
          { id: "vietnamese-iced-coffee", name: "Vietnamese Iced Coffee", description: "With sweetened condensed milk", servingSize: "12 oz (est.)", calories: 135, protein: 3, totalFat: 4, totalCarbs: 22, sodium: 55, fiber: 0, attributes: ["vegetarian"] },
          { id: "thai-iced-tea", name: "Thai Iced Tea", servingSize: "16 oz (est.)", calories: 250, protein: 3, totalFat: 6, totalCarbs: 46, sodium: 80, fiber: 0, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  // ══ Park Ave ══════════════════════════════════════════════════════════════

  {
    slug: "wendys-park-ave",
    name: "Wendy's",
    cuisine: "Burgers & fries",
    area: "park-ave",
    address: "500 Park Ave, Worcester, MA 01610",
    lat: 42.253249,
    lng: -71.828011,
    menuUrl: "https://order.wendys.com/us/en/national/menu",
    hours: everyDay(open("6:30 am", "10:00 pm")),
    nutritionSource: "official",
    sources: ["order.wendys.com nutrition (Oct 2026)", "Hours: OpenStreetMap"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "burgers",
        name: "Burgers",
        items: [
          { id: "daves-single", name: "Dave's Single", servingSize: "1 sandwich", calories: 560, protein: 31, totalFat: 34, totalCarbs: 37, sodium: 1170, fiber: 2 },
          { id: "baconator", name: "Baconator", servingSize: "1 sandwich", calories: 890, protein: 59, totalFat: 58, totalCarbs: 36, sodium: 1580, fiber: 1 },
          { id: "jr-bacon-cheeseburger", name: "Jr. Bacon Cheeseburger", servingSize: "1 sandwich", calories: 350, protein: 18, totalFat: 21, totalCarbs: 24, sodium: 650, fiber: 1 },
        ],
      },
      {
        id: "chicken",
        name: "Chicken",
        items: [
          { id: "spicy-chicken", name: "Spicy Chicken Sandwich", servingSize: "1 sandwich", calories: 560, protein: 28, totalFat: 26, totalCarbs: 55, sodium: 1500, fiber: 3 },
          { id: "classic-chicken", name: "Classic Chicken Sandwich", servingSize: "1 sandwich", calories: 550, protein: 28, totalFat: 25, totalCarbs: 55, sodium: 1630, fiber: 3 },
          { id: "nuggets-10", name: "Chicken Nuggets", servingSize: "10 pieces", calories: 430, protein: 23, totalFat: 27, totalCarbs: 22, sodium: 900, fiber: 1 },
          { id: "grilled-chicken-wrap", name: "Grilled Chicken Ranch Wrap", servingSize: "1 wrap", calories: 420, protein: 28, totalFat: 16, totalCarbs: 41, sodium: 1100, fiber: 1 },
        ],
      },
      {
        id: "sides-frosty",
        name: "Sides, Salads & Frosty",
        items: [
          { id: "jr-fries", name: "Natural-Cut Fries", servingSize: "Jr.", calories: 260, protein: 4, totalFat: 12, totalCarbs: 35, sodium: 420, fiber: 3 },
          { id: "chili", name: "Chili", servingSize: "1 serving", calories: 280, protein: 19, totalFat: 12, totalCarbs: 24, sodium: 1050, fiber: 3 },
          { id: "baked-potato", name: "Plain Baked Potato", servingSize: "1 potato", calories: 270, protein: 7, totalFat: 0, totalCarbs: 61, sodium: 40, fiber: 7, attributes: ["vegan", "vegetarian"] },
          { id: "apple-pecan-salad", name: "Apple Pecan Salad", description: "Dressing adds 90 cal", servingSize: "1 salad, no dressing", calories: 420, protein: 30, totalFat: 22, totalCarbs: 27, sodium: 980, fiber: 5 },
          { id: "jr-frosty", name: "Chocolate Frosty", servingSize: "Jr.", calories: 310, protein: 9, totalFat: 9, totalCarbs: 49, sodium: 180, fiber: 1, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "breakfast",
        name: "Breakfast",
        items: [
          { id: "bacon-egg-swiss-croissant", name: "Bacon, Egg & Swiss Croissant", servingSize: "1 sandwich", calories: 420, protein: 18, totalFat: 23, totalCarbs: 34, sodium: 800, fiber: 0 },
        ],
      },
    ],
  },

  {
    slug: "peppercorns",
    name: "Peppercorn's Grille & Tavern",
    cuisine: "American grille & pub",
    area: "park-ave",
    address: "455 Park Ave, Worcester, MA 01610",
    lat: 42.25467,
    lng: -71.825483,
    menuUrl: "https://www.toasttab.com/local/order/peppercorns-worcester-455-park-ave",
    hours: week({
      0: open("12:00 pm", "8:00 pm"),
      2: open("11:30 am", "9:00 pm"), 3: open("11:30 am", "9:00 pm"), 4: open("11:30 am", "9:00 pm"),
      5: open("11:30 am", "9:30 pm"), 6: open("12:00 pm", "9:30 pm"),
    }),
    nutritionSource: "estimated",
    sources: ["Restaurantji & Pearl (hours)", "Toast online menu (items, Oct 2026)"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "burgers-sandwiches",
        name: "Burgers & Sandwiches",
        items: [
          { id: "smash-burger", name: "Smash Burger", description: "Two 4 oz patties, American cheese, bacon, caramelized onions, garlic aioli, potato bun", servingSize: "1 burger, no side (est.)", calories: 1080, protein: 62, totalFat: 70, totalCarbs: 48, sodium: 2120, fiber: 4 },
          { id: "cheese-burger", name: "Cheese Burger", description: "American cheese, lettuce, tomato, onion, potato bun", servingSize: "1 burger, ~8 oz patty, no side (est.)", calories: 770, protein: 50, totalFat: 45, totalCarbs: 41, sodium: 1110, fiber: 3 },
          { id: "bacon-cheese-burger", name: "Bacon Cheese Burger", description: "Applewood bacon, American cheese, lettuce, tomato, onion, potato bun", servingSize: "1 burger, ~8 oz patty, no side (est.)", calories: 860, protein: 56, totalFat: 52, totalCarbs: 41, sodium: 1440, fiber: 3 },
          { id: "nashville-chicken", name: "Nashville Fried Chicken", description: "Spicy fried chicken, hot honey, pickles, ranch, potato bun", servingSize: "1 sandwich, no side (est.)", calories: 975, protein: 47, totalFat: 52, totalCarbs: 80, sodium: 2170, fiber: 4 },
          { id: "turkey-club", name: "Turkey Club", description: "Bacon, American cheese, garlic mayo, Tuscan bread", servingSize: "1 sandwich, no side (est.)", calories: 740, protein: 43, totalFat: 32, totalCarbs: 65, sodium: 2500, fiber: 4 },
          { id: "reuben", name: "Reuben", description: "Corned beef, Swiss, Thousand Island, sauerkraut, marble rye", servingSize: "1 sandwich, no side (est.)", calories: 955, protein: 48, totalFat: 66, totalCarbs: 42, sodium: 2960, fiber: 6 },
          { id: "brisket-grilled-cheese", name: "Beef Brisket Grilled Cheese", description: "Smoked brisket, cheddar, American, caramelized onion, garlic aioli", servingSize: "1 sandwich, no side (est.)", calories: 1060, protein: 49, totalFat: 66, totalCarbs: 64, sodium: 1870, fiber: 4 },
          { id: "french-fries", name: "French Fries", servingSize: "1 side, ~6 oz (est.)", calories: 480, protein: 6, totalFat: 24, totalCarbs: 60, sodium: 450, fiber: 5 },
        ],
      },
      {
        id: "starters-salads",
        name: "Starters, Soups & Salads",
        items: [
          { id: "buffalo-tenders", name: "Buffalo Chicken Tenders", description: "With bleu cheese and celery", servingSize: "1 appetizer, ~8 oz tenders (est.)", calories: 945, protein: 48, totalFat: 68, totalCarbs: 35, sodium: 3330, fiber: 3 },
          { id: "french-onion", name: "French Onion Soup", servingSize: "1 crock (est.)", calories: 350, protein: 16, totalFat: 17, totalCarbs: 32, sodium: 1500, fiber: 2 },
          { id: "chicken-avocado-salad", name: "Chicken Avocado Salad", description: "Grilled avocado, chicken, mozzarella pearls, asparagus, basil champagne vinaigrette", servingSize: "1 full salad (est.)", calories: 800, protein: 59, totalFat: 54, totalCarbs: 22, sodium: 940, fiber: 10 },
          { id: "caesar", name: "Caesar Salad", servingSize: "1 full salad (est.)", calories: 495, protein: 15, totalFat: 39, totalCarbs: 24, sodium: 1110, fiber: 4 },
          { id: "house-salad", name: "House Salad", servingSize: "1 full salad, 3 tbsp vinaigrette (est.)", calories: 300, protein: 5, totalFat: 21, totalCarbs: 26, sodium: 650, fiber: 5, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "entrees",
        name: "Entrées",
        items: [
          { id: "chicken-parm", name: "Chicken Parmesan", description: "With linguine marinara", servingSize: "1 lunch plate (est.)", calories: 1190, protein: 75, totalFat: 42, totalCarbs: 129, sodium: 2410, fiber: 10 },
          { id: "fish-and-chips", name: "Fish and Chips", description: "IPA-battered haddock, coleslaw, tartar sauce, fries", servingSize: "1 lunch plate (est.)", calories: 1300, protein: 45, totalFat: 78, totalCarbs: 103, sodium: 1770, fiber: 8 },
          { id: "pretzel-chicken", name: "Pretzel Chicken", description: "Dijon aioli, bacon-cheddar croquette, green beans", servingSize: "1 lunch plate (est.)", calories: 1060, protein: 56, totalFat: 61, totalCarbs: 66, sodium: 2000, fiber: 6 },
          { id: "steak-tips", name: "Steak Tips", description: "Peppers, onions, mushrooms, rice pilaf, marsala sauce", servingSize: "1 lunch plate (est.)", calories: 790, protein: 53, totalFat: 35, totalCarbs: 60, sodium: 1800, fiber: 3 },
          { id: "adult-mac", name: "Adult Mac & Cheese", description: "Shells, cheddar sauce, panko topping", servingSize: "1 dinner plate (est.)", calories: 1245, protein: 49, totalFat: 55, totalCarbs: 135, sodium: 1410, fiber: 7, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "pho-dakao",
    name: "Pho Dakao",
    cuisine: "Vietnamese pho",
    area: "park-ave",
    address: "593 Park Ave, Worcester, MA 01603",
    lat: 42.248483,
    lng: -71.832021,
    hours: everyDay(open("11:00 am", "9:00 pm")),
    nutritionSource: "estimated",
    sources: ["Uber Eats & Roadtrippers (hours)", "Allmenus (items)"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "pho",
        name: "Pho",
        items: [
          { id: "pho-dac-biet", name: "Pho Dac Biet", description: "Combination: rare steak, brisket, flank, tendon, tripe and meatballs", servingSize: "1 large bowl (est.)", calories: 550, protein: 42, totalFat: 14, totalCarbs: 62, sodium: 1900, fiber: 2 },
          { id: "pho-tai", name: "Pho Tai", description: "Rare steak", servingSize: "1 large bowl (est.)", calories: 450, protein: 32, totalFat: 9, totalCarbs: 60, sodium: 1800, fiber: 2 },
          { id: "pho-ga", name: "Pho Ga", description: "Shredded chicken", servingSize: "1 large bowl (est.)", calories: 430, protein: 30, totalFat: 8, totalCarbs: 60, sodium: 1700, fiber: 2 },
        ],
      },
      {
        id: "vermicelli-rice",
        name: "Vermicelli & Rice Plates",
        items: [
          { id: "bun-thit-nuong", name: "Grilled Pork Vermicelli", description: "Bún thịt nướng with herbs, peanuts and nuoc cham", servingSize: "1 bowl (est.)", calories: 770, protein: 32, totalFat: 27, totalCarbs: 98, sodium: 1700, fiber: 5 },
          { id: "bun-combo", name: "Shrimp, Pork & Spring Roll Vermicelli", servingSize: "1 bowl (est.)", calories: 840, protein: 44, totalFat: 26, totalCarbs: 106, sodium: 2090, fiber: 5 },
          { id: "com-thit-nuong", name: "Grilled Pork Rice Plate", servingSize: "1 plate, 1½ cups rice (est.)", calories: 725, protein: 37, totalFat: 22, totalCarbs: 90, sodium: 1230, fiber: 2 },
          { id: "com-ga", name: "Roasted Marinated Chicken Rice Plate", servingSize: "1 plate, 1½ cups rice (est.)", calories: 765, protein: 49, totalFat: 25, totalCarbs: 84, sodium: 1380, fiber: 2 },
          { id: "fried-rice", name: "Vietnamese Fried Rice", servingSize: "1 plate, ~2½ cups (est.)", calories: 750, protein: 30, totalFat: 25, totalCarbs: 95, sodium: 1500, fiber: 4 },
        ],
      },
      {
        id: "appetizers",
        name: "Appetizers",
        items: [
          { id: "summer-rolls", name: "Fresh Summer Rolls", description: "Shrimp and pork, with peanut sauce", servingSize: "2 rolls (est.)", calories: 330, protein: 17, totalFat: 7, totalCarbs: 49, sodium: 800, fiber: 3 },
          { id: "spring-rolls", name: "Crispy Spring Rolls", description: "With dipping sauce", servingSize: "2 rolls (est.)", calories: 270, protein: 8, totalFat: 13, totalCarbs: 30, sodium: 850, fiber: 1 },
          { id: "banh-xeo", name: "Vietnamese Crepe", description: "Bánh xèo with shrimp, pork and bean sprouts", servingSize: "1 crepe with sauce (est.)", calories: 650, protein: 25, totalFat: 35, totalCarbs: 60, sodium: 1200, fiber: 3 },
        ],
      },
      {
        id: "drinks",
        name: "Drinks",
        items: [
          { id: "iced-coffee", name: "Vietnamese Iced Coffee", description: "With sweetened condensed milk", servingSize: "12 oz (est.)", calories: 135, protein: 3, totalFat: 4, totalCarbs: 22, sodium: 55, fiber: 0, attributes: ["vegetarian"] },
          { id: "thai-iced-tea", name: "Thai Iced Tea", servingSize: "16 oz (est.)", calories: 250, protein: 3, totalFat: 6, totalCarbs: 46, sodium: 80, fiber: 0, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "el-basha-park-ave",
    name: "El Basha",
    cuisine: "Lebanese",
    area: "park-ave",
    address: "256 Park Ave, Worcester, MA 01609",
    lat: 42.264766,
    lng: -71.819311,
    menuUrl: "https://www.opentable.com/r/el-basha-park-ave",
    // Lunch on weekdays, dinner Mon–Sat. Sunday hours aren't published, so it shows closed.
    hours: week({
      1: [...open("11:30 am", "2:00 pm", "Lunch"), ...open("4:30 pm", "9:00 pm", "Dinner")],
      2: [...open("11:30 am", "2:00 pm", "Lunch"), ...open("4:30 pm", "9:00 pm", "Dinner")],
      3: [...open("11:30 am", "2:00 pm", "Lunch"), ...open("4:30 pm", "9:00 pm", "Dinner")],
      4: [...open("11:30 am", "2:00 pm", "Lunch"), ...open("4:30 pm", "9:00 pm", "Dinner")],
      5: [...open("11:30 am", "2:00 pm", "Lunch"), ...open("4:30 pm", "9:30 pm", "Dinner")],
      6: open("4:30 pm", "9:30 pm", "Dinner"),
    }),
    nutritionSource: "estimated",
    sources: ["OpenTable (hours, Oct 2026)", "Menu: standard Lebanese dishes named in OpenTable listings and reviews"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "mezze",
        name: "Mezze & Salads",
        items: [
          { id: "hummus", name: "Hummus with Pita", servingSize: "1 cup with olive oil & 1 pita (est.)", calories: 695, protein: 25, totalFat: 39, totalCarbs: 68, sodium: 1220, fiber: 16, attributes: ["vegan", "vegetarian"] },
          { id: "baba-ghanoush", name: "Baba Ghanoush with Pita", servingSize: "1 cup & 1 pita (est.)", calories: 465, protein: 12, totalFat: 26, totalCarbs: 51, sodium: 1120, fiber: 8, attributes: ["vegan", "vegetarian"] },
          { id: "tabbouleh", name: "Tabbouleh", servingSize: "1½ cups (est.)", calories: 250, protein: 4, totalFat: 18, totalCarbs: 20, sodium: 450, fiber: 5, attributes: ["vegan", "vegetarian"] },
          { id: "fattoush", name: "Fattoush Salad", servingSize: "1 salad with dressing (est.)", calories: 350, protein: 5, totalFat: 24, totalCarbs: 30, sodium: 700, fiber: 6, attributes: ["vegan", "vegetarian"] },
          { id: "lentil-soup", name: "Lentil Soup", servingSize: "12 oz bowl (est.)", calories: 230, protein: 12, totalFat: 6, totalCarbs: 33, sodium: 800, fiber: 10, attributes: ["vegan", "vegetarian"] },
        ],
      },
      {
        id: "plates",
        name: "Plates",
        items: [
          { id: "falafel-plate", name: "Falafel Plate", description: "With rice pilaf, salad and tahini", servingSize: "5 falafel & sides (est.)", calories: 870, protein: 27, totalFat: 43, totalCarbs: 96, sodium: 1500, fiber: 12, attributes: ["vegan", "vegetarian"] },
          { id: "chicken-kabob", name: "Chicken Kabob (Shish Taouk) Plate", description: "With rice pilaf, salad and garlic sauce", servingSize: "6 oz chicken & sides (est.)", calories: 760, protein: 55, totalFat: 36, totalCarbs: 49, sodium: 1350, fiber: 3 },
          { id: "beef-kabob", name: "Beef Kabob Plate", description: "With rice pilaf and salad", servingSize: "6 oz beef & sides (est.)", calories: 660, protein: 51, totalFat: 28, totalCarbs: 47, sodium: 1100, fiber: 3 },
          { id: "kafta-kabob", name: "Kafta Kabob Plate", description: "Ground beef with parsley and onion, rice pilaf, salad", servingSize: "6 oz kafta & sides (est.)", calories: 760, protein: 43, totalFat: 42, totalCarbs: 49, sodium: 1250, fiber: 4 },
          { id: "chicken-shawarma-plate", name: "Chicken Shawarma Plate", description: "With rice pilaf, salad and garlic sauce", servingSize: "6 oz chicken & sides (est.)", calories: 840, protein: 49, totalFat: 48, totalCarbs: 49, sodium: 1550, fiber: 3 },
          { id: "chicken-shawarma-roll", name: "Chicken Shawarma Roll-Up", description: "Pita wrap with garlic sauce and pickles", servingSize: "1 wrap (est.)", calories: 555, protein: 36, totalFat: 25, totalCarbs: 46, sodium: 1380, fiber: 3 },
        ],
      },
      {
        id: "dessert",
        name: "Dessert",
        items: [
          { id: "baklava", name: "Baklava", servingSize: "2 pieces, ~60 g (est.)", calories: 280, protein: 4, totalFat: 17, totalCarbs: 30, sodium: 150, fiber: 2, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  // ══ Trolley Yard · Park Ave & Grove St ════════════════════════════════════

  {
    slug: "daves-hot-chicken",
    name: "Dave's Hot Chicken",
    cuisine: "Hot chicken",
    area: "trolley-yard",
    address: "41 Park Ave, Worcester, MA 01605",
    lat: 42.28261,
    lng: -71.807811,
    menuUrl: "https://www.daveshotchicken.com/menu/",
    hours: week({
      0: open("11:00 am", "1:00 am"), 1: open("11:00 am", "1:00 am"), 2: open("11:00 am", "1:00 am"),
      3: open("11:00 am", "1:00 am"), 4: open("11:00 am", "2:00 am"), 5: open("11:00 am", "2:00 am"),
      6: open("11:00 am", "2:00 am"),
    }),
    nutritionSource: "official",
    sources: ["Dave's Hot Chicken nutrition chart (revised 3/16/26)", "Hours: OpenStreetMap"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "chicken",
        name: "Tenders, Sliders & Bites",
        items: [
          { id: "tender-spicy", name: "Tender (Mild to Reaper)", servingSize: "1 tender, no sides (224 g)", calories: 550, protein: 25, totalFat: 35, totalCarbs: 31, sodium: 1480, fiber: 0 },
          { id: "tender-mild", name: "Tender (No Spice or Lite Mild)", servingSize: "1 tender, no sides (216 g)", calories: 490, protein: 25, totalFat: 29, totalCarbs: 30, sodium: 1210, fiber: 0 },
          { id: "slider-spicy", name: "Slider (Mild to Reaper)", servingSize: "1 slider, no sides (257 g)", calories: 680, protein: 31, totalFat: 43, totalCarbs: 42, sodium: 1420, fiber: 0 },
          { id: "slider-mild", name: "Slider (No Spice or Lite Mild)", servingSize: "1 slider, no sides (249 g)", calories: 620, protein: 31, totalFat: 37, totalCarbs: 41, sodium: 1150, fiber: 0 },
          { id: "bites-spicy", name: "Dave's Bites (Mild to Reaper)", servingSize: "10 pieces (313 g)", calories: 750, protein: 41, totalFat: 45, totalCarbs: 41, sodium: 2000, fiber: 0 },
          { id: "bites-mild", name: "Dave's Bites (No Spice or Lite Mild)", servingSize: "10 pieces (299 g)", calories: 650, protein: 41, totalFat: 35, totalCarbs: 39, sodium: 1570, fiber: 0 },
          { id: "not-chicken-slider", name: "Dave's Not Chicken Slider (Mild to Reaper)", servingSize: "1 slider, no sides (188 g)", calories: 520, protein: 8, totalFat: 37, totalCarbs: 40, sodium: 960, fiber: 0 },
        ],
      },
      {
        id: "sides-sauces",
        name: "Sides & Sauces",
        items: [
          { id: "fries", name: "Fries", servingSize: "1 order (170 g)", calories: 440, protein: 6, totalFat: 20, totalCarbs: 58, sodium: 1200, fiber: 3 },
          { id: "cheese-fries", name: "Cheese Fries", servingSize: "1 order (190 g)", calories: 450, protein: 7, totalFat: 20, totalCarbs: 60, sodium: 1340, fiber: 3 },
          { id: "mac-cheese", name: "Mac & Cheese", servingSize: "1 side (215 g)", calories: 290, protein: 14, totalFat: 16, totalCarbs: 25, sodium: 1090, fiber: 1 },
          { id: "kale-slaw", name: "Kale Slaw", servingSize: "1 side (144 g)", calories: 270, protein: 2, totalFat: 26, totalCarbs: 8, sodium: 170, fiber: 3 },
          { id: "top-loaded-fries", name: "Top-Loaded Fries", servingSize: "Regular (593 g)", calories: 1390, protein: 36, totalFat: 74, totalCarbs: 144, sodium: 3800, fiber: 7 },
          { id: "daves-sauce", name: "Dave's Sauce", servingSize: "1.5 oz cup", calories: 270, protein: 0, totalFat: 28, totalCarbs: 3, sodium: 220, fiber: 0 },
          { id: "ranch", name: "Ranch", servingSize: "1.5 oz cup", calories: 200, protein: 0, totalFat: 21, totalCarbs: 3, sodium: 260, fiber: 0 },
          { id: "hot-honey", name: "Mike's Hot Honey", servingSize: "1.5 oz cup", calories: 150, protein: 0, totalFat: 0, totalCarbs: 36, sodium: 0, fiber: 0 },
        ],
      },
    ],
  },

  {
    slug: "chipotle-park-ave",
    name: "Chipotle",
    cuisine: "Mexican grill",
    area: "trolley-yard",
    address: "49 Park Ave, Worcester, MA 01605",
    lat: 42.281927,
    lng: -71.808259,
    menuUrl: "https://locations.chipotle.com/ma/worcester/49-park-ave",
    hours: everyDay(open("10:45 am", "10:00 pm")),
    nutritionSource: "official",
    sources: [
      "chipotle.com nutrition calculator data (Oct 2026)",
      "Builds are sums of Chipotle's standard portions",
      "Hours: OpenStreetMap",
    ],
    lastVerified: "2026-10",
    sections: [
      {
        id: "builds",
        name: "Popular Builds",
        items: [
          { id: "chicken-burrito", name: "Chicken Burrito", description: "Flour tortilla, white rice, black beans, chicken, fresh tomato salsa, cheese, romaine", servingSize: "1 burrito, standard portions", calories: 980, protein: 58, totalFat: 29.5, totalCarbs: 118, sodium: 2210, fiber: 13 },
          { id: "chicken-bowl", name: "Chicken Burrito Bowl", description: "White rice, black beans, chicken, fajita veggies, fresh tomato salsa, cheese, romaine", servingSize: "1 bowl, standard portions", calories: 680, protein: 51, totalFat: 20.5, totalCarbs: 73, sodium: 1760, fiber: 11 },
          { id: "steak-bowl", name: "Steak Burrito Bowl", description: "Brown rice, pinto beans, steak, fajita veggies, roasted chili-corn salsa, sour cream, romaine", servingSize: "1 bowl, standard portions", calories: 705, protein: 39, totalFat: 24, totalCarbs: 82, sodium: 1240, fiber: 16 },
          { id: "sofritas-bowl", name: "Sofritas Bowl", description: "Brown rice, black beans, sofritas, fajita veggies, fresh tomato salsa, guacamole, romaine", servingSize: "1 bowl, standard portions", calories: 770, protein: 23, totalFat: 39.5, totalCarbs: 85, sodium: 2030, fiber: 21, attributes: ["vegan", "vegetarian"] },
        ],
      },
      {
        id: "proteins",
        name: "Proteins",
        items: [
          { id: "chicken", name: "Chicken", servingSize: "4 oz", calories: 180, protein: 32, totalFat: 7, totalCarbs: 0, sodium: 310, fiber: 0 },
          { id: "steak", name: "Steak", servingSize: "4 oz", calories: 150, protein: 21, totalFat: 6, totalCarbs: 1, sodium: 330, fiber: 1 },
          { id: "carnitas", name: "Carnitas", servingSize: "4 oz", calories: 210, protein: 23, totalFat: 12, totalCarbs: 0, sodium: 450, fiber: 0 },
          { id: "barbacoa", name: "Barbacoa", servingSize: "4 oz", calories: 170, protein: 24, totalFat: 7, totalCarbs: 2, sodium: 530, fiber: 1 },
          { id: "sofritas", name: "Sofritas", servingSize: "4 oz", calories: 150, protein: 8, totalFat: 10, totalCarbs: 9, sodium: 560, fiber: 3, attributes: ["vegan", "vegetarian"] },
        ],
      },
      {
        id: "base",
        name: "Tortilla, Rice & Beans",
        items: [
          { id: "burrito-tortilla", name: "Flour Tortilla (burrito)", servingSize: "1 tortilla", calories: 320, protein: 8, totalFat: 9, totalCarbs: 50, sodium: 600, fiber: 3, attributes: ["vegan", "vegetarian"] },
          { id: "white-rice", name: "White Rice", servingSize: "4 oz", calories: 210, protein: 4, totalFat: 4, totalCarbs: 40, sodium: 350, fiber: 1, attributes: ["vegan", "vegetarian"] },
          { id: "brown-rice", name: "Brown Rice", servingSize: "4 oz", calories: 210, protein: 4, totalFat: 6, totalCarbs: 36, sodium: 190, fiber: 2, attributes: ["vegan", "vegetarian"] },
          { id: "black-beans", name: "Black Beans", servingSize: "4 oz", calories: 130, protein: 8, totalFat: 1.5, totalCarbs: 22, sodium: 210, fiber: 7, attributes: ["vegan", "vegetarian"] },
          { id: "pinto-beans", name: "Pinto Beans", servingSize: "4 oz", calories: 130, protein: 8, totalFat: 1.5, totalCarbs: 21, sodium: 210, fiber: 8, attributes: ["vegan", "vegetarian"] },
          { id: "fajita-veggies", name: "Fajita Veggies", servingSize: "2.5 oz", calories: 20, protein: 1, totalFat: 0, totalCarbs: 5, sodium: 150, fiber: 1, attributes: ["vegan", "vegetarian"] },
        ],
      },
      {
        id: "toppings-sides",
        name: "Toppings & Sides",
        items: [
          { id: "fresh-tomato-salsa", name: "Fresh Tomato Salsa", servingSize: "3.5 oz", calories: 25, protein: 0, totalFat: 0, totalCarbs: 4, sodium: 550, fiber: 1, attributes: ["vegan", "vegetarian"] },
          { id: "corn-salsa", name: "Roasted Chili-Corn Salsa", servingSize: "3.5 oz", calories: 80, protein: 3, totalFat: 1.5, totalCarbs: 16, sodium: 330, fiber: 3, attributes: ["vegan", "vegetarian"] },
          { id: "green-salsa", name: "Tomatillo-Green Chili Salsa", servingSize: "2 oz", calories: 15, protein: 0, totalFat: 0, totalCarbs: 4, sodium: 260, fiber: 0, attributes: ["vegan", "vegetarian"] },
          { id: "red-salsa", name: "Tomatillo-Red Chili Salsa", servingSize: "2 oz", calories: 30, protein: 0, totalFat: 0, totalCarbs: 4, sodium: 500, fiber: 1, attributes: ["vegan", "vegetarian"] },
          { id: "sour-cream", name: "Sour Cream", servingSize: "2 oz", calories: 110, protein: 2, totalFat: 9, totalCarbs: 2, sodium: 30, fiber: 0, attributes: ["vegetarian"] },
          { id: "cheese", name: "Cheese", servingSize: "1 oz", calories: 110, protein: 6, totalFat: 8, totalCarbs: 1, sodium: 190, fiber: 0, attributes: ["vegetarian"] },
          { id: "guacamole", name: "Guacamole", servingSize: "4 oz", calories: 230, protein: 2, totalFat: 22, totalCarbs: 8, sodium: 370, fiber: 6, attributes: ["vegan", "vegetarian"] },
          { id: "queso", name: "Queso Blanco", servingSize: "2 oz", calories: 120, protein: 5, totalFat: 9, totalCarbs: 4, sodium: 250, fiber: 0, attributes: ["vegetarian"] },
          { id: "romaine", name: "Romaine Lettuce", servingSize: "1 oz", calories: 5, protein: 0, totalFat: 0, totalCarbs: 1, sodium: 0, fiber: 1, attributes: ["vegan", "vegetarian"] },
          { id: "chips", name: "Chips", servingSize: "4 oz", calories: 540, protein: 7, totalFat: 25, totalCarbs: 73, sodium: 390, fiber: 7, attributes: ["vegan", "vegetarian"] },
          { id: "chips-guac", name: "Chips & Guacamole", servingSize: "8 oz", calories: 770, protein: 9, totalFat: 47, totalCarbs: 81, sodium: 760, fiber: 13, attributes: ["vegan", "vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "starbucks-park-ave",
    name: "Starbucks",
    cuisine: "Coffee & café",
    area: "trolley-yard",
    address: "41 Park Ave, Ste 5A, Worcester, MA 01605",
    lat: 42.282563,
    lng: -71.808247,
    menuUrl: "https://www.starbucks.com/menu",
    hours: everyDay(open("5:00 am", "9:00 pm")),
    nutritionSource: "official",
    sources: ["starbucks.com menu nutrition (Oct 2026)", "Yelp & Restaurantji (hours)"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "coffee",
        name: "Espresso & Coffee",
        items: [
          { id: "caffe-latte", name: "Caffè Latte", servingSize: "Grande, 2% milk", calories: 190, protein: 13, totalFat: 7, totalCarbs: 19, sodium: 170, fiber: 0, attributes: ["vegetarian"] },
          { id: "caramel-macchiato", name: "Caramel Macchiato", servingSize: "Grande, 2% milk", calories: 250, protein: 10, totalFat: 7, totalCarbs: 35, sodium: 150, fiber: 0, attributes: ["vegetarian"] },
          { id: "iced-latte", name: "Iced Caffè Latte", servingSize: "Grande, 2% milk", calories: 130, protein: 8, totalFat: 4.5, totalCarbs: 13, sodium: 115, fiber: 0, attributes: ["vegetarian"] },
          { id: "bsoe", name: "Iced Brown Sugar Oatmilk Shaken Espresso", servingSize: "Grande", calories: 150, protein: 2, totalFat: 4.5, totalCarbs: 27, sodium: 150, fiber: 2, attributes: ["vegan", "vegetarian"] },
          { id: "cold-brew", name: "Cold Brew", servingSize: "Grande", calories: 5, protein: 0, totalFat: 0, totalCarbs: 0, sodium: 15, fiber: 0, attributes: ["vegan", "vegetarian"] },
          { id: "iced-coffee", name: "Iced Coffee", servingSize: "Grande", calories: 5, protein: 0, totalFat: 0, totalCarbs: 0, sodium: 10, fiber: 0, attributes: ["vegan", "vegetarian"] },
        ],
      },
      {
        id: "blended",
        name: "Frappuccino & Refreshers",
        items: [
          { id: "caramel-frappuccino", name: "Caramel Frappuccino", servingSize: "Grande", calories: 380, protein: 4, totalFat: 16, totalCarbs: 55, sodium: 230, fiber: 0, attributes: ["vegetarian"] },
          { id: "pink-drink", name: "Pink Drink", servingSize: "Grande", calories: 140, protein: 0, totalFat: 2.5, totalCarbs: 28, sodium: 85, fiber: 1 },
        ],
      },
      {
        id: "food",
        name: "Breakfast & Bakery",
        items: [
          { id: "bacon-gouda", name: "Bacon, Gouda & Egg Sandwich", servingSize: "1 sandwich (120 g)", calories: 360, protein: 18, totalFat: 18, totalCarbs: 35, sodium: 710, fiber: 1 },
          { id: "impossible-sandwich", name: "Impossible Breakfast Sandwich", servingSize: "1 sandwich (150 g)", calories: 420, protein: 21, totalFat: 22, totalCarbs: 36, sodium: 800, fiber: 3 },
          { id: "bacon-egg-bites", name: "Bacon & Gruyère Egg Bites", servingSize: "2 bites (130 g)", calories: 300, protein: 19, totalFat: 20, totalCarbs: 9, sodium: 680, fiber: 0 },
          { id: "egg-white-bites", name: "Egg White & Roasted Red Pepper Egg Bites", servingSize: "2 bites (130 g)", calories: 170, protein: 12, totalFat: 8, totalCarbs: 11, sodium: 470, fiber: 0, attributes: ["vegetarian"] },
          { id: "butter-croissant", name: "Butter Croissant", servingSize: "1 croissant (62 g)", calories: 250, protein: 5, totalFat: 14, totalCarbs: 26, sodium: 300, fiber: 1, attributes: ["vegetarian"] },
          { id: "chocolate-croissant", name: "Chocolate Croissant", servingSize: "1 croissant (80 g)", calories: 300, protein: 5, totalFat: 18, totalCarbs: 34, sodium: 300, fiber: 2, attributes: ["vegetarian"] },
          { id: "cake-pop", name: "Birthday Cake Pop", servingSize: "1 pop (38 g)", calories: 160, protein: 2, totalFat: 8, totalCarbs: 21, sodium: 95, fiber: 0, attributes: ["vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "island-fin-poke",
    name: "Island Fin Poké",
    cuisine: "Poke bowls",
    area: "trolley-yard",
    address: "41 Park Ave, Ste 2, Worcester, MA 01605",
    lat: 42.282602,
    lng: -71.807976,
    menuUrl: "https://www.islandfinpoke.com/menu/",
    hours: everyDay(open("11:00 am", "8:45 pm")),
    nutritionSource: "official",
    sources: [
      "islandfinpoke.com nutrition calculator (Oct 2026)",
      "Bowls are sums of standard portions with 2 protein scoops; they match Island Fin's published bowl calories",
      "Hours: Toast",
    ],
    lastVerified: "2026-10",
    sections: [
      {
        id: "bowls",
        name: "Signature Bowls",
        items: [
          { id: "ahi-tuna-bowl", name: "Ahi Tuna Bowl", description: "White rice, ahi tuna, edamame, corn, OG sauce, pineapple mango salsa, spicy pickled veggies, scallions, togarashi, sesame seeds, crispy onions", servingSize: "1 regular bowl (476 g)", calories: 635, protein: 28, totalFat: 15, totalCarbs: 93, sodium: 1065, fiber: 4 },
          { id: "chicken-bowl", name: "Chicken Bowl", description: "White rice, chicken, edamame, corn, Wicked Wahine, pineapple, scallions, Ono Ono, wonton strips", servingSize: "1 regular bowl (434 g)", calories: 585, protein: 33, totalFat: 5, totalCarbs: 95, sodium: 695, fiber: 4 },
          { id: "kbbq-chicken-bowl", name: "Korean BBQ Chicken Bowl", description: "White rice, KBBQ chicken, sweet onions, corn, kimchi, spicy pickled veggies, scallions, togarashi, sesame seeds", servingSize: "1 regular bowl (492 g)", calories: 590, protein: 22, totalFat: 10.5, totalCarbs: 98, sodium: 1370, fiber: 4 },
          { id: "salmon-bowl", name: "Salmon Bowl", description: "White rice, salmon, edamame, corn, ponzu, seaweed, avocado cream, tempura crisps", servingSize: "1 regular bowl (443 g)", calories: 575, protein: 24, totalFat: 11.5, totalCarbs: 87, sodium: 710, fiber: 7 },
          { id: "spicy-tuna-bowl", name: "Spicy Tuna Bowl", description: "White rice, spicy tuna, edamame, OG veggies, OG sauce, pineapple mango salsa, seaweed, togarashi, sesame seeds, crispy garlic", servingSize: "1 regular bowl (470 g)", calories: 620, protein: 25, totalFat: 17.5, totalCarbs: 87, sodium: 1220, fiber: 7 },
          { id: "tofu-bowl", name: "Tofu Bowl", description: "Build-your-own example: white rice, tofu, edamame, corn, ponzu, seaweed, scallions, sesame seeds", servingSize: "1 regular bowl (437 g)", calories: 535, protein: 22, totalFat: 11, totalCarbs: 86, sodium: 635, fiber: 9, attributes: ["vegan", "vegetarian"] },
        ],
      },
    ],
  },

  {
    slug: "hot-table",
    name: "Hot Table",
    cuisine: "Panini & salads",
    area: "trolley-yard",
    address: "49 Park Ave, Worcester, MA 01605",
    lat: 42.281941,
    lng: -71.808034,
    hours: week({
      1: open("11:00 am", "8:00 pm"), 2: open("11:00 am", "8:00 pm"), 3: open("11:00 am", "8:00 pm"),
      4: open("11:00 am", "8:00 pm"), 5: open("11:00 am", "9:00 pm"), 6: open("11:00 am", "9:00 pm"),
    }),
    nutritionSource: "estimated",
    sources: ["Hours: OpenStreetMap", "Grubhub menu via Allmenus (items)"],
    lastVerified: "2026-10",
    sections: [
      {
        id: "panini",
        name: "Panini",
        items: [
          { id: "chicken-pesto", name: "Chicken Pesto Panini", description: "Roasted chicken, pesto mayo, provolone, salami, roasted onions & red peppers", servingSize: "1 panini (est.)", calories: 960, protein: 61, totalFat: 50, totalCarbs: 69, sodium: 2220, fiber: 5 },
          { id: "buffalo-chicken", name: "Buffalo Chicken Panini", description: "Roasted chicken, buffalo sauce, ranch, American & blue cheese, lettuce, tomato", servingSize: "1 panini (est.)", calories: 825, protein: 52, totalFat: 39, totalCarbs: 66, sodium: 2830, fiber: 4 },
          { id: "steak-cheese", name: "Steak and Cheese Panini", description: "Shaved steak, mayo, American, roasted onions & red peppers", servingSize: "1 panini (est.)", calories: 870, protein: 47, totalFat: 46, totalCarbs: 68, sodium: 1840, fiber: 5 },
          { id: "turkey-club", name: "Turkey Club Panini", description: "Turkey, bacon, mayo, American, lettuce, onions, tomatoes", servingSize: "1 panini (est.)", calories: 710, protein: 41, totalFat: 30, totalCarbs: 67, sodium: 2380, fiber: 4 },
          { id: "italian-coldcut", name: "Italian Coldcut Panini", description: "Ham, salami, mayo, provolone, lettuce, onions, roasted red & banana peppers", servingSize: "1 panini (est.)", calories: 825, protein: 42, totalFat: 43, totalCarbs: 66, sodium: 2810, fiber: 5 },
          { id: "caprese", name: "Caprese Panini", description: "Fresh mozzarella, tomatoes, basil, olive oil, balsamic", servingSize: "1 panini (est.)", calories: 685, protein: 27, totalFat: 35, totalCarbs: 67, sodium: 910, fiber: 4, attributes: ["vegetarian"] },
          { id: "santa-fe-veggie", name: "Santa Fe Veggie Panini", description: "Pepper jack, chipotle mayo, corn, black beans, onions, jalapeños, tomatoes", servingSize: "1 panini (est.)", calories: 690, protein: 27, totalFat: 29, totalCarbs: 82, sodium: 1220, fiber: 9, attributes: ["vegetarian"] },
          { id: "grilled-cheese", name: "Grilled Cheese Panini", servingSize: "1 panini, 2 oz cheddar (est.)", calories: 550, protein: 25, totalFat: 24, totalCarbs: 59, sodium: 1010, fiber: 3, attributes: ["vegetarian"] },
        ],
      },
      {
        id: "salads-soup",
        name: "Salads, Soup & Mac",
        items: [
          { id: "apple-walnut-salad", name: "Apple Walnut Salad", description: "Mixed greens, apples, cranberries, glazed walnuts, blue cheese, honey lemon vinaigrette", servingSize: "1 salad with dressing (est.)", calories: 615, protein: 11, totalFat: 42, totalCarbs: 51, sodium: 565, fiber: 6, attributes: ["vegetarian"] },
          { id: "santa-fe-salad", name: "Santa Fe Salad", description: "Mixed greens, black beans, corn, jalapeños, pepper jack, tortilla strips, chipotle ranch", servingSize: "1 salad with dressing (est.)", calories: 490, protein: 15, totalFat: 35, totalCarbs: 32, sodium: 740, fiber: 7, attributes: ["vegetarian"] },
          { id: "caesar", name: "Caesar Salad", servingSize: "1 salad with dressing (est.)", calories: 450, protein: 12, totalFat: 36, totalCarbs: 20, sodium: 950, fiber: 3 },
          { id: "broccoli-cheddar", name: "Cheddar Broccoli Soup", servingSize: "8 oz cup (est.)", calories: 280, protein: 10, totalFat: 20, totalCarbs: 14, sodium: 950, fiber: 2 },
          { id: "mac-cheese", name: "Mac & Cheese", servingSize: "8 oz cup (est.)", calories: 450, protein: 19, totalFat: 23, totalCarbs: 41, sodium: 800, fiber: 2, attributes: ["vegetarian"] },
        ],
      },
    ],
  },
];
