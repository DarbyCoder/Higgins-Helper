import axios from "axios";
import * as cheerio from "cheerio";
import type {
  MealPeriod,
  FoodStation,
  MenuItem,
  DiningLocation,
  LocationStub,
} from "../types/index.js";
import {
  MEAL_TAB_NAV_LINK_SELECTOR,
  MEAL_TAB_CONTENT_SELECTOR,
  STATION_WRAPPER_SELECTOR,
  STATION_HEADING_SELECTOR,
  STATION_DESCRIPTION_SELECTOR,
  MENU_ITEM_LI_SELECTOR,
  MENU_ITEM_ANCHOR_SELECTOR,
  NUTRITION_DIV_SELECTOR,
} from "./selectors.js";
import { parseNutritionBlob } from "./nutritionParser.js";

// ─── HTTP Client Configuration ───────────────────────────────────────────────

const httpClient = axios.create({
  timeout: 15_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; Higgins Helper/1.0; Clark University student app)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

// ─── Tab Name Extraction (index-based, not id-based) ──────────────────────────

/**
 * Returns an ordered array of meal period names from the nav link bar.
 *
 * WHY index-based?
 * The Clark dining site renders all nav `<a>` tags with href="#" (no unique
 * anchor). The `.c-tab` content divs also lack meaningful `id` attributes.
 * The only reliable correlation is positional order: nav[0] → tab[0], etc.
 *
 * @param $ Cheerio root
 * @returns string[] of meal names in DOM order
 */
function getMealNamesInOrder($: cheerio.CheerioAPI): string[] {
  const names: string[] = [];
  $(MEAL_TAB_NAV_LINK_SELECTOR).each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    // Strip any embedded time string like " (8am-9am)" from the nav label,
    // since we already get times from the Layer 1 stub.
    const name = raw.replace(/\s*\(.*?\)\s*$/, "").trim() || raw;
    names.push(name);
  });
  return names;
}

// ─── Station Parsing ─────────────────────────────────────────────────────────

function parseStation(
  $: cheerio.CheerioAPI,
  stationEl: any
): FoodStation | null {
  const $station = $(stationEl);

  const heading = $station.find(STATION_HEADING_SELECTOR).first();
  const stationId = heading.attr("data-id") ?? `station-${Math.random().toString(36).slice(2)}`;
  const stationName = heading.text().trim();

  if (!stationName) {
    console.warn("[locationMenuScraper] Skipping station with no name");
    return null;
  }

  const description =
    $station.find(STATION_DESCRIPTION_SELECTOR).first().text().trim() ||
    undefined;

  const items: MenuItem[] = [];

  $station.find(MENU_ITEM_LI_SELECTOR).each((_, itemEl) => {
    const $item = $(itemEl);
    const $anchor = $item.find(MENU_ITEM_ANCHOR_SELECTOR).first();
    const recipeId = $anchor.attr("data-recipe") ?? "";

    if (!recipeId) return;

    // Fix #4: recipeId is a Base64 string (e.g. "cmVjaXBlOjY0ODMwNw==") that
    // contains ":" and "=" — both of which are invalid in CSS ID selectors.
    // Using `#recipe-nutrition-${recipeId}` would throw a CSS syntax error or
    // silently fail to match. Use an attribute selector instead.
    const $nutritionDiv = $item
      .find(`div[id="recipe-nutrition-${recipeId}"]`)
      .first();

    const nutritionJson = $nutritionDiv.length
      ? $nutritionDiv.text()
      : $item.find(NUTRITION_DIV_SELECTOR).first().text();

    if (!nutritionJson.trim()) {
      console.warn(`[locationMenuScraper] No nutrition JSON for recipe ${recipeId}`);
      return;
    }

    const anchorClasses = ($anchor.attr("class") ?? "").split(/\s+/);
    const menuItem = parseNutritionBlob(recipeId, nutritionJson, anchorClasses);
    if (menuItem) items.push(menuItem);
  });

  return { id: stationId, name: stationName, description, items };
}

// ─── Meal Period Parsing ──────────────────────────────────────────────────────

/**
 * Parses all meal period tabs from a location page.
 *
 * Uses index-based correlation (nav label[i] → tab content[i]) because the
 * Clark dining site does not put unique IDs on tab content divs.
 */
function parseMealPeriods(
  $: cheerio.CheerioAPI,
  stub: LocationStub
): MealPeriod[] {
  // Ordered meal names from the nav bar
  const mealNames = getMealNamesInOrder($);

  // Ordered tab content panels
  const tabEls: any[] = [];
  $(MEAL_TAB_CONTENT_SELECTOR).each((_, el) => { tabEls.push(el as any); });

  // Build hours lookup from the Layer 1 stub (case-insensitive, ignoring parentheticals)
  const hoursLookup = new Map(
    stub.meals.map((m) => [m.name.toLowerCase().replace(/\s*\(.*?\)/, "").trim(), m])
  );

  // Fix #11: Fallback for retail/single-meal locations (e.g. Cougar Cafe, The Den)
  // that render .menu-station elements directly on the page without .c-tab wrappers.
  // When no tabs are found but stations exist, collect them under an "All Day" period.
  if (tabEls.length === 0) {
    const allStations: FoodStation[] = [];
    $(STATION_WRAPPER_SELECTOR).each((_, stationEl) => {
      const station = parseStation($, stationEl);
      if (station) allStations.push(station);
    });

    if (allStations.length > 0) {
      console.log(
        `[locationMenuScraper] ${stub.name}: No meal tabs found — ` +
        `collected ${allStations.length} station(s) under "All Day" (retail/single-meal layout)`
      );
      return [{
        name: "All Day",
        startTime: stub.meals[0]?.startTime ?? "",
        endTime: stub.meals[0]?.endTime ?? "",
        stations: allStations,
      }];
    }

    console.warn(
      `[locationMenuScraper] ${stub.name}: No meal tabs AND no stations found. ` +
      `The page may be empty or the DOM structure has changed.`
    );
    return [];
  }

  // Scraper fragility guard: if tab count ≠ nav label count, zip may misassign meals.
  if (mealNames.length !== tabEls.length) {
    console.warn(
      `[locationMenuScraper] Layout mismatch for ${stub.name}: Found ${mealNames.length} meal nav labels but ${tabEls.length} content tabs. ` +
      `Meals may be mapped incorrectly.`
    );
  }

  const mealPeriods: MealPeriod[] = [];

  tabEls.forEach((tabEl, i) => {
    // Zip by index
    const mealName = mealNames[i] ?? `Meal ${i + 1}`;
    const normalizedName = mealName.toLowerCase().replace(/\s*\(.*?\)/, "").trim();
    const hours = hoursLookup.get(normalizedName);

    const stations: FoodStation[] = [];
    $(tabEl).find(STATION_WRAPPER_SELECTOR).each((_, stationEl) => {
      const station = parseStation($, stationEl);
      if (station) stations.push(station);
    });

    if (stations.length > 0 || mealName !== `Meal ${i + 1}`) {
      mealPeriods.push({
        name: mealName,
        startTime: hours?.startTime ?? "",
        endTime: hours?.endTime ?? "",
        stations,
      });
    }
  });

  console.log(
    `[locationMenuScraper] Meal periods for ${stub.name}: ` +
    mealPeriods.map((m) => `"${m.name}"(${m.stations.length} stations)`).join(", ")
  );

  return mealPeriods;
}

// ─── Retry Helper ─────────────────────────────────────────────────────────────

/**
 * Retries an async operation up to maxAttempts times with exponential backoff.
 *
 * Fix #5: Uses axios.isAxiosError() and inspects err.response.status / err.code
 * instead of searching err.message for patterns Axios never produces.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Fix #5: Properly detect retryable Axios errors
      const isRetryable =
        axios.isAxiosError(err) &&
        ((err.response !== undefined &&
          err.response.status >= 500 &&
          err.response.status < 600) ||
          err.code === "ECONNRESET" ||
          err.code === "ETIMEDOUT" ||
          err.code === "ECONNABORTED" ||
          err.message.toLowerCase().includes("network"));

      if (!isRetryable || attempt === maxAttempts) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[locationMenuScraper] ${label} — attempt ${attempt} failed (${axios.isAxiosError(err) ? err.code ?? err.response?.status : "unknown"}), retrying in ${delay}ms…`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function scrapeLocationMenu(
  stub: LocationStub
): Promise<DiningLocation> {
  console.log(
    `[locationMenuScraper] Fetching: ${stub.name} (${stub.slug}) → ${stub.url}`
  );

  let html: string;

  try {
    const response = await withRetry(
      () => httpClient.get<string>(stub.url),
      `${stub.name} (${stub.url})`
    );
    html = response.data;
  } catch (err) {
    const status = axios.isAxiosError(err)
      ? (err.response?.status ?? "network error")
      : "unknown";
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[locationMenuScraper] HTTP ${status} fetching ${stub.url}: ${msg}`
    );
  }

  const $ = cheerio.load(html);
  const meals = parseMealPeriods($, stub);

  console.log(
    `[locationMenuScraper] ✓ ${stub.name}: ${meals.length} meal period(s), ` +
      `${meals.reduce((acc, m) => acc + m.stations.length, 0)} station(s), ` +
      `${meals.reduce((acc, m) => acc + m.stations.reduce((a, s) => a + s.items.length, 0), 0)} item(s)`
  );

  return {
    slug: stub.slug,
    name: stub.name,
    url: stub.url,
    isOpen: stub.isOpen,
    meals,
  };
}

