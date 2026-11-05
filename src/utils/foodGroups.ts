/**
 * @file src/utils/foodGroups.ts
 * @description Guesses a dish's food group from its name, station and macros.
 * The dining data has no food groups, so this is a best guess and some dishes
 * will land in the wrong one. Whole dishes (bowls, sandwiches, pizza) go in
 * "Mixed dishes" rather than being called a protein or a grain.
 *
 * Checked in order; the first rule that matches wins.
 */
import type { MenuItem } from "@/types";

export type FoodGroup =
  | "mixed" | "protein" | "vegetables" | "grains" | "fruit" | "dairy" | "toppings" | "desserts" | "drinks";

export const FOOD_GROUPS: { id: FoodGroup; label: string; color: string }[] = [
  { id: "mixed",      label: "Mixed dishes",      color: "var(--color-text-2)" },
  { id: "protein",    label: "Proteins",          color: "var(--color-protein)" },
  { id: "vegetables", label: "Vegetables",        color: "var(--color-cal)" },
  { id: "grains",     label: "Grains & starches", color: "var(--color-carbs)" },
  { id: "fruit",      label: "Fruit",             color: "#F472B6" },
  { id: "dairy",      label: "Dairy",             color: "var(--color-fiber)" },
  { id: "toppings",   label: "Sauces & toppings", color: "var(--color-fat)" },
  { id: "desserts",   label: "Desserts",          color: "var(--color-streak)" },
  { id: "drinks",     label: "Drinks",            color: "#60A5FA" },
];

export const FOOD_GROUP_BY_ID = Object.fromEntries(FOOD_GROUPS.map((g) => [g.id, g])) as Record<FoodGroup, (typeof FOOD_GROUPS)[number]>;

const RULES: [FoodGroup, RegExp, "name" | "station"][] = [
  ["desserts",   /dessert|bakery|sweet/i, "station"],
  ["desserts",   /cookie|brownie|\bcake|\bpie\b|cobbler|ice cream|sorbet|pudding|donut|doughnut|cupcake|m&m|chocolate chip|marshmallow|whipped topping|sprinkles|fudge|cinnamon roll|shortcake/i, "name"],
  ["drinks",     /smoothie|beverage|drink|coffee/i, "station"],
  ["drinks",     /smoothie|juice|coffee|\btea\b|soda|lemonade|protein powder|\bmilk\b(?!.*shake)/i, "name"],
  // Parts of a dish that look like one: buns, wraps, croissants; taco meat
  ["grains",     /\bbuns?\b|^tortilla wrap$|croissant/i, "name"],
  ["protein",    /^taco (beef|meat|chicken)/i, "name"],
  ["mixed",      /bowl|sandwich|\bwrap\b|burger(?! patty)|pizza|quesadilla|burrito|\btacos?\b|\bsub\b|hoagie|panini|\bclub\b|\bmelt\b|grilled cheese|\bsalad\b|soup|chili|stir.?fry|ravioli|lasagna|mac (&|and) cheese|casserole|rachel|monte cristo|cheesesteak|\bkit\b|gyro|calzone|nachos|enchilada/i, "name"],
  ["toppings",   /sauce|dressing|vinaigrette|mayo|aioli|syrup|jelly|\bjam\b|preserves|\bhoney\b|glaze|salsa|pico de gallo|guacamole|hummus|ketchup|mustard|relish|\bbutter\b|margarine|spread|\boil\b|vinegar|sour cream|whipped cream|queso|gravy|compote|pickle|olives|jalape|banana pepper|cherry pepper|crouton|seeds|kernels|granola|raisins|cranberries|coconut|horseradish|scallion|capers|bacon pieces|sugar|^cinnamon$|minced garlic|seasoning/i, "name"],
  ["dairy",      /cheese|yogurt|cottage|parmesan|mozzarella|feta|cheddar|provolone|swiss|ricotta|monterey jack|\bkefir\b/i, "name"],
  ["protein",    /chicken|beef|pork|turkey|\bham\b|bacon|sausage|steak|tofu|tempeh|seitan|\beggs?\b|fish|salmon|\btuna\b|shrimp|\bcod\b|tilapia|meatball|wings|patty|\bbeans?\b|lentil|chickpea|garbanzo|pulled|tinga|carnitas|brisket|salami|capicola|pepperoni|roast beef|chick'?n|falafel|edamame|\blamb\b/i, "name"],
  ["grains",     /\brice\b|pasta|penne|spaghetti|rigatoni|fettuccine|linguine|noodle|bread|bagel|\broll\b|tortilla|pita|baguette|muffin|waffle|pancake|french toast|\boats?\b|oatmeal|grits|quinoa|farro|couscous|potato|fries|\btots\b|chips|cereal|cracker|toast|biscuit|polenta|stuffing/i, "name"],
  ["vegetables", /lettuce|spinach|arugula|kale|greens|romaine|broccoli|carrot|cucumber|tomato|onion|pepper|mushroom|zucchini|squash|eggplant|cauliflower|brussels|beet|celery|\bpeas\b|\bcorn\b|cabbage|slaw|vegetable|veggie|asparagus|avocado|sprouts/i, "name"],
  ["fruit",      /fruit/i, "station"],
  ["fruit",      /apple|banana|berr|grape|melon|cantaloupe|honeydew|pineapple|orange|peach|mango|kiwi|cherr|\bpear\b|\bplum\b|clementine|acai/i, "name"],
  ["vegetables", /green|produce|vegetable|salad bar/i, "station"],
];

const num = (n: number) => (Number.isFinite(n) ? n : 0);

export function foodGroupOf(item: MenuItem, stationName = ""): FoodGroup {
  const name = item.name ?? "";
  for (const [group, re, field] of RULES) {
    if (re.test(field === "name" ? name : stationName)) return group;
  }
  // Nothing in the name to go on: go by where the calories come from
  const p = num(item.protein) * 4, c = num(item.totalCarbs) * 4, f = num(item.totalFat) * 9;
  const total = p + c + f;
  if (total <= 0) return "toppings";
  if (p / total >= 0.35 && num(item.protein) >= 8) return "protein";
  if (c / total >= 0.6) return "grains";
  if (f / total >= 0.6) return "toppings";
  return "mixed";
}
