/**
 * @file server/scraper/menuHoursScraper.ts
 * @description Layer 1 scraper — fetches the root `/menu-hours/?date=YYYY-MM-DD`
 * page from clark.nmcfood.com and extracts:
 *   - All dining locations (name + URL)
 *   - Whether each location is open on the given date
 *   - Operating hours per meal period (Breakfast, Lunch, Dinner, etc.)
 *
 * The output of this scraper (an array of LocationStub objects) is then fed
 * to the Layer 2 scraper (locationMenuScraper.ts) in parallel.
 *
 * DOM structure targeted (from live analysis 2026-08-09):
 * ```
 * tr (one per location)
 *   ├── td > a[href*="/locations/"]  ← name + URL
 *   └── td                           ← hours block
 *         └── span (×3 per meal period): [mealName, startTime, endTime]
 * ```
 */

import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import type { LocationStub } from "../types/index.js";
import {
  buildMenuHoursUrl,
  LOCATION_ROW_SELECTOR,
  LOCATION_LINK_SELECTOR,
  HOURS_SPAN_SELECTOR,
  CLOSED_INDICATOR,
} from "./selectors.js";

// ─── HTTP Client ──────────────────────────────────────────────────────────────

const httpClient = axios.create({
  timeout: 15_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; HigginsHelper/1.0; Clark University student app)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

// ─── URL Slug Extraction ──────────────────────────────────────────────────────

/**
 * Extracts the location slug from its full URL.
 * Input:  "https://clark.nmcfood.com/locations/the-table-at-higgins/?date=2026-08-09"
 * Output: "the-table-at-higgins"
 *
 * @param href - Full location URL string
 * @returns The slug segment, or an empty string if the URL is malformed
 */
function extractSlugFromUrl(href: string): string {
  try {
    const url = new URL(href);
    // pathname: "/locations/the-table-at-higgins/"
    const parts = url.pathname.split("/").filter(Boolean);
    // parts: ["locations", "the-table-at-higgins"]
    return parts[1] ?? "";
  } catch {
    console.warn(`[menuHoursScraper] Could not parse URL slug from: ${href}`);
    return "";
  }
}

// ─── Hours Parsing ────────────────────────────────────────────────────────────

/**
 * Parses the hours cell of a location row into an array of meal period stubs.
 *
 * The hours are encoded in groups of three consecutive <span> elements:
 *   <span>Breakfast</span> <span>7:00 am</span> - <span>11:00 am</span>
 *
 * Some locations may show "Closed" instead of meal spans.
 *
 * @param $ - Cheerio root
 * @param hoursCell - The <td> element containing the hours spans
 * @returns Array of { name, startTime, endTime } objects
 */
function parseHoursCell(
  $: cheerio.CheerioAPI,
  hoursCell: cheerio.AnyNode
): LocationStub["meals"] {
  const spans = $(hoursCell)
    .find(HOURS_SPAN_SELECTOR)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean); // Remove any empty strings

  const meals: LocationStub["meals"] = [];

  // Process spans in groups of 3: [mealName, startTime, endTime]
  for (let i = 0; i + 2 < spans.length; i += 3) {
    const name = spans[i] ?? "";
    const startTime = spans[i + 1] ?? "";
    const endTime = spans[i + 2] ?? "";

    // Skip if it looks like a "Closed" indicator rather than a time
    if (
      name.toLowerCase() === CLOSED_INDICATOR ||
      startTime.toLowerCase() === CLOSED_INDICATOR
    ) {
      continue;
    }

    // Basic validation: start and end should look like times (contain ":")
    if (name && startTime.includes(":") && endTime.includes(":")) {
      meals.push({ name, startTime, endTime });
    }
  }

  return meals;
}

// ─── Row Parsing ─────────────────────────────────────────────────────────────

/**
 * Parses a single table row into a LocationStub.
 * Returns null if the row doesn't contain a valid location link.
 *
 * @param $ - Cheerio root
 * @param rowEl - A <tr> element from the menu-hours page
 * @param date - The date string (YYYY-MM-DD) used to build the location URL
 */
function parseLocationRow(
  $: cheerio.CheerioAPI,
  rowEl: cheerio.AnyNode,
  date: string
): LocationStub | null {
  const $row = $(rowEl);

  // ── Find the location anchor ──
  const $anchor = $row.find(LOCATION_LINK_SELECTOR).first();
  if (!$anchor.length) return null;

  const href = $anchor.attr("href") ?? "";
  const name = $anchor.text().trim();
  if (!href || !name) return null;

  const slug = extractSlugFromUrl(href);
  if (!slug) return null;

  // Reconstruct a clean URL with our date param (the href may already have one,
  // but we rebuild it to guarantee consistency and avoid stale dates from the site)
  const cleanUrl = `https://clark.nmcfood.com/locations/${slug}/?date=${date}`;

  // ── Detect closed status ──
  const rowText = $row.text().toLowerCase();
  const isOpen = !rowText.includes(CLOSED_INDICATOR);

  // ── Parse hours from the second <td> in the row ──
  const cells = $row.find("td");
  // The hours cell is the second td (index 1); first td contains the location anchor
  const hoursCell = cells.eq(1);
  const meals = parseHoursCell($, hoursCell);

  return {
    slug,
    name,
    url: cleanUrl,
    isOpen,
    hoursText: hoursCell.text().trim(), // Kept for debugging
    meals,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Layer 1 scraper entry point.
 * Fetches the /menu-hours/ page for the given date and returns an array of
 * LocationStub objects — one per dining location found on the page.
 *
 * Closed locations are included in the result with `isOpen: false` and an
 * empty `meals` array, so the frontend can still display their status.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Array of LocationStub objects ready to be fed to Layer 2
 * @throws On network failure or unexpected HTTP status codes
 */
export async function scrapeMenuHours(date: string): Promise<LocationStub[]> {
  const url = buildMenuHoursUrl(date);
  console.log(`[menuHoursScraper] Fetching root page: ${url}`);

  let html: string;

  try {
    const response = await httpClient.get<string>(url);
    html = response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status ?? "network error";
    throw new Error(
      `[menuHoursScraper] Failed to fetch ${url} — HTTP ${status}: ${axiosErr.message}`
    );
  }

  // ── Load the HTML into Cheerio ──
  const $ = cheerio.load(html);

  // ── Find all location rows ──
  // We use the `:has()` selector to target only rows containing a location link
  const locationStubs: LocationStub[] = [];

  $(LOCATION_ROW_SELECTOR).each((_, rowEl) => {
    const stub = parseLocationRow($, rowEl, date);
    if (stub) {
      locationStubs.push(stub);
    }
  });

  if (locationStubs.length === 0) {
    console.warn(
      `[menuHoursScraper] No locations found for date ${date}. ` +
        `The site structure may have changed, or there are no dining services on this date.`
    );
  } else {
    const openCount = locationStubs.filter((s) => s.isOpen).length;
    console.log(
      `[menuHoursScraper] ✓ Found ${locationStubs.length} location(s), ${openCount} open on ${date}`
    );
  }

  return locationStubs;
}
