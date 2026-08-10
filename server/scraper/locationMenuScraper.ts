/**
 * @file server/scraper/locationMenuScraper.ts
 * @description Layer 2 scraper — fetches and parses an individual dining
 * location page to extract food stations, menu items, and full nutritional data.
 *
 * ── DOM Reality (verified 2026-08-10) ──────────────────────────────────────
 * The Clark dining site does NOT use unique IDs on .c-tab content divs.
 * Instead, ALL nav links share href="#", making the id-based tab↔name mapping
 * approach unreliable.
 *
 * Actual approach used:
 *   - Read nav links in DOM order  → produces an ordered list of meal names
 *   - Read .c-tab divs in DOM order → produces an ordered list of tab panels
 *   - Zip them by index: tabNames[i] is the name for tabs[i]
 *
 * This is the only reliable method because it matches what the browser does:
 * nav link 0 activates tab 0, nav link 1 activates tab 1, etc.
 */

import axios, { AxiosError } from "axios";
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
      "Mozilla/5.0 (compatible; HigginsHelper/1.0; Clark University student app)",
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
  stationEl: cheerio.AnyNode
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

    const $nutritionDiv = $item
      .find(`#recipe-nutrition-${recipeId}`)
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
  const tabEls: cheerio.Element[] = [];
  $(MEAL_TAB_CONTENT_SELECTOR).each((_, el) => tabEls.push(el as cheerio.Element));

  // Build hours lookup from the Layer 1 stub (case-insensitive, ignoring parentheticals)
  const hoursLookup = new Map(
    stub.meals.map((m) => [m.name.toLowerCase().replace(/\s*\(.*?\)/, "").trim(), m])
  );

  const mealPeriods: MealPeriod[] = [];

  tabEls.forEach((tabEl, i) => {
    // Zip by index: if there are more tabs than nav labels (or vice versa), skip
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function scrapeLocationMenu(
  stub: LocationStub
): Promise<DiningLocation> {
  console.log(
    `[locationMenuScraper] Fetching: ${stub.name} (${stub.slug}) → ${stub.url}`
  );

  let html: string;

  try {
    const response = await httpClient.get<string>(stub.url);
    html = response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status ?? "network error";
    throw new Error(
      `[locationMenuScraper] HTTP ${status} fetching ${stub.url}: ${axiosErr.message}`
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
