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

import axios from "axios";
import * as cheerio from "cheerio";
import type { LocationStub } from "../types/index.js";
import {
  BASE_URL,
  buildMenuHoursUrl,
  buildLocationUrl,
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
      "Mozilla/5.0 (compatible; Higgins Helper/1.0; Clark University student app)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

// ─── URL Slug Extraction ──────────────────────────────────────────────────────

/**
 * Extracts the location slug from its full or relative URL.
 * Input:  "https://clark.nmcfood.com/locations/the-table-at-higgins/?date=2026-08-09"
 *   OR    "/locations/the-table-at-higgins/"
 * Output: "the-table-at-higgins"
 *
 * Fix #1: Pass BASE_URL as second argument so relative paths like
 * "/locations/..." are resolved correctly instead of throwing TypeError.
 *
 * @param href - Full or relative location URL string
 * @returns The slug segment, or an empty string if the URL is malformed
 */
function extractSlugFromUrl(href: string): string {
  try {
    // Fix #1: BASE_URL ensures relative hrefs (e.g. "/locations/foo/") resolve correctly
    const url = new URL(href, BASE_URL);
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
 * Fix #12: Validates times with a regex that accepts both colon formats
 * ("7:00 am") and non-colon formats ("7 am", "11 am") instead of the
 * brittle `includes(":")` check that rejected valid non-colon times.
 *
 * @param $ - Cheerio root
 * @param hoursCell - The <td> element containing the hours spans
 * @returns Array of { name, startTime, endTime } objects
 */

/** Matches times like "7:00 am", "11 am", "2:30 PM" */
const TIME_REGEX = /^\d{1,2}(:\d{2})?\s*(am|pm)$/i;

function parseHoursCell(
  $: cheerio.CheerioAPI,
  hoursCell: any
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

    // Fix #12: Accept both "7:00 am" and "7 am" style times
    if (name && TIME_REGEX.test(startTime) && TIME_REGEX.test(endTime)) {
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
  rowEl: any,
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

  // Fix #14: Use buildLocationUrl() from selectors.ts instead of a hardcoded
  // base URL string, so a single edit to selectors.ts propagates everywhere.
  const cleanUrl = buildLocationUrl(slug, date);

  // ── Parse hours from the second <td> in the row ──
  const cells = $row.find("td");
  const hoursCell = cells.eq(1);
  const meals = parseHoursCell($, hoursCell);

  // ── Determine open status ──
  // Fix #3.6: Tightened isOpen logic. Previously any non-empty hoursText that
  // didn't contain the exact word "closed" was treated as open, causing false
  // positives for "Summer Break", "No dining service today", etc.
  // Now: only treat as open when we actually parsed valid meal periods.
  // If meals is empty, fall back to the word "closed" check as a secondary
  // signal — but default to closed rather than open on ambiguous text.
  const hoursText = hoursCell.text().trim().toLowerCase();
  const isOpen =
    meals.length > 0 ||
    (hoursText.length > 0 &&
      !hoursText.includes(CLOSED_INDICATOR) &&
      !hoursText.includes("no service") &&
      !hoursText.includes("break") &&
      !hoursText.includes("renovation") &&
      !hoursText.includes("closed"));

  return {
    slug,
    name,
    url: cleanUrl,
    isOpen,
    hoursText,
    meals,
  };
}

// ─── Retry Helper ─────────────────────────────────────────────────────────────

/**
 * Retries an async operation up to maxAttempts times with exponential backoff.
 *
 * Fix #5: The previous implementation checked `err.message` for patterns like
 * "ECONNRESET" or "HTTP 500", but Axios never formats errors that way:
 *   - Network errors store the code on `err.code`, not `err.message`
 *   - HTTP errors use "Request failed with status code 500" in `err.message`
 * Now uses `axios.isAxiosError()` and inspects `err.response.status` / `err.code`.
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
        `[menuHoursScraper] ${label} — attempt ${attempt} failed (${axios.isAxiosError(err) ? err.code ?? err.response?.status : "unknown"}), retrying in ${delay}ms…`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
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
    const response = await withRetry(
      () => httpClient.get<string>(url),
      url
    );
    html = response.data;
  } catch (err) {
    const status = axios.isAxiosError(err)
      ? (err.response?.status ?? "network error")
      : "unknown";
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[menuHoursScraper] Failed to fetch ${url} — HTTP ${status}: ${msg}`
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
