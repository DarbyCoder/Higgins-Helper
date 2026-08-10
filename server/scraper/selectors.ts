/**
 * @file server/scraper/selectors.ts
 * @description Centralized CSS selectors and URL constants for the Clark
 * University dining scraper. All selectors are derived from live DOM analysis
 * of clark.nmcfood.com performed on 2026-08-09.
 *
 * Keeping selectors here means a site layout change requires only editing
 * this single file rather than hunting through scraper logic.
 */

// ─── Base URLs ────────────────────────────────────────────────────────────────

export const BASE_URL = "https://clark.nmcfood.com";

/**
 * Root page listing all dining locations and their operating hours.
 * Append `?date=YYYY-MM-DD` to filter for a specific day.
 */
export const MENU_HOURS_PATH = "/menu-hours/";

/**
 * Builds the full URL for the root menu-hours page.
 */
export const buildMenuHoursUrl = (date: string): string =>
  `${BASE_URL}${MENU_HOURS_PATH}?date=${date}`;

/**
 * Builds a location-specific menu URL with the date already embedded.
 */
export const buildLocationUrl = (slug: string, date: string): string =>
  `${BASE_URL}/locations/${slug}/?date=${date}`;

// ─── Layer 1 Selectors: /menu-hours/ Page ────────────────────────────────────

/**
 * Selects every anchor tag that links to a specific dining location.
 * These appear inside table rows in the main content area.
 * Example match: <a href="https://clark.nmcfood.com/locations/the-table-at-higgins/?date=...">
 */
export const LOCATION_LINK_SELECTOR = 'a[href*="/locations/"]';

/**
 * Selects the table row that wraps each location entry.
 * The location anchor and its hours live within the same <tr>.
 */
export const LOCATION_ROW_SELECTOR = "tr:has(a[href*=\"/locations/\"])";

/**
 * Within a location row, selects the cell containing hours information.
 * Hours sit in the second <td> of the row.
 */
export const HOURS_CELL_SELECTOR = "td:nth-child(2)";

/**
 * Within the hours cell, span tags appear in groups of 3:
 * [meal-name, start-time, end-time], [meal-name, start-time, end-time], ...
 * Example: <span>Breakfast</span> <span>7:00 am</span> - <span>11:00 am</span>
 */
export const HOURS_SPAN_SELECTOR = "span";

/**
 * Text that appears when a location is closed on a given date.
 * We check for this to set `isOpen: false` without throwing an error.
 */
export const CLOSED_INDICATOR = "closed";

// ─── Layer 2 Selectors: /locations/{slug}/ Page ──────────────────────────────

/**
 * The tab navigation bar. Each link corresponds to a meal period (Breakfast, Lunch, etc.)
 * and its text becomes the MealPeriod.name.
 * Example: <a class="c-tabs-nav__link is-active" href="#tab-XXXXX">Breakfast</a>
 */
export const MEAL_TAB_NAV_LINK_SELECTOR = ".c-tabs-nav__link";

/**
 * Each meal period's content wrapper. We iterate ALL of these (not just .is-active)
 * to scrape every meal in a single HTTP request.
 * The id attribute ("tab-XXXXX") correlates this div to its nav link via href="#tab-XXXXX".
 */
export const MEAL_TAB_CONTENT_SELECTOR = ".c-tab";

/**
 * Within a meal tab, each food station is wrapped in this class.
 */
export const STATION_WRAPPER_SELECTOR = ".menu-station";

/**
 * The h4 heading that labels each food station.
 * Its `data-id` attribute is the unique station identifier.
 * Example: <h4 class="toggle-menu-station-data" data-id="788996914">allgood</h4>
 */
export const STATION_HEADING_SELECTOR = "h4.toggle-menu-station-data";

/**
 * Optional descriptive paragraph for a station (e.g. allergen notices).
 */
export const STATION_DESCRIPTION_SELECTOR = ".menu-station-description p";

/**
 * The <li> wrapper for each individual menu item within a station.
 */
export const MENU_ITEM_LI_SELECTOR = "li.menu-item-li";

/**
 * The anchor tag that shows the item name and holds the `data-recipe` ID.
 * Also carries dietary class flags like `prop-vegan`, `prop-vegetarian`.
 * Example: <a class="show-nutrition prop-vegan" data-recipe="cmVjaXBlOjY0ODMwNw">
 */
export const MENU_ITEM_ANCHOR_SELECTOR = "a.show-nutrition";

/**
 * The hidden div containing the full nutrition JSON blob for an item.
 * The div's id is `recipe-nutrition-{data-recipe value}`.
 * We use a prefix attribute selector since the recipe ID suffix varies.
 * The raw text content of this div is a parseable JSON string.
 */
export const NUTRITION_DIV_SELECTOR = 'div[id^="recipe-nutrition-"]';

/**
 * CSS class prefix used to denote dietary property flags on the anchor tag.
 * We strip this prefix to get the icon name: "prop-vegan" → "vegan"
 */
export const DIETARY_CLASS_PREFIX = "prop-";

// ─── Known Nutrition Fact Labels ─────────────────────────────────────────────
// These are the label strings we extract for quick-access fields on MenuItem.

export const FACT_LABEL = {
  CALORIES: "Calories",
  TOTAL_FAT: "Total Fat",
  TOTAL_CARBS: "Total Carbohydrate",
  PROTEIN: "Protein",
  SODIUM: "Sodium",
  FIBER: "Dietary Fiber",
} as const;
