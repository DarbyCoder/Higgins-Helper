/**
 * @file server/routes/menu.ts
 * @description Express router for menu-related API endpoints.
 *
 * GET /api/menu?date=YYYY-MM-DD
 *   Orchestrates the two-layer scraping pipeline:
 *     1. menuHoursScraper  → gets all location stubs + hours
 *     2. locationMenuScraper → fetches each location page in parallel
 *   Results are cached per-date with a 1-hour TTL.
 *
 * GET /api/menu/refresh?date=YYYY-MM-DD
 *   Force-invalidates the cache for a given date and re-scrapes.
 *   Useful during development and for real-time menu updates.
 */

import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import type { DailyMenuResponse, DiningLocation } from "../types/index.js";
import { scrapeMenuHours } from "../scraper/menuHoursScraper.js";
import { scrapeLocationMenu } from "../scraper/locationMenuScraper.js";
import { menuCache, encodeJson, type EncodedBody } from "../cache/menuCache.js";

export const menuRouter = Router();

// ─── Sending ──────────────────────────────────────────────────────────────────

/**
 * Sends the smallest encoding the client accepts, plain JSON if it accepts none.
 *
 * Brotli is checked first on purpose: it is less than half gzip's size on the
 * menu, and browsers list gzip first in Accept-Encoding, so normal negotiation
 * would pick gzip. Cloudflare, in front of Render, asks us for "br, gzip" whatever
 * the visitor sent and converts for visitors who can't read Brotli. It leaves
 * responses with a Content-Encoding header alone rather than encoding them twice.
 *
 * Don't add Cache-Control: no-transform here. It would stop Cloudflare making
 * that conversion, so a client without Brotli could receive bytes it can't read.
 *
 * Setting the ETag ourselves stops res.send() hashing the body on every request.
 * res.send() still answers If-None-Match with a bodyless 304.
 */
function sendEncoded(req: Request, res: Response, body: EncodedBody): void {
  res.vary("Accept-Encoding");
  res.type("json");
  res.setHeader("ETag", body.etag);

  if (req.acceptsEncodings("br")) {
    res.setHeader("Content-Encoding", "br");
    res.send(body.brotli);
  } else if (req.acceptsEncodings("gzip")) {
    res.setHeader("Content-Encoding", "gzip");
    res.send(body.gzip);
  } else {
    res.send(body.json);
  }
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns today's date in YYYY-MM-DD using America/New_York timezone.
 * Clark University is in Worcester, MA — UTC would show tomorrow's menu after ~8pm ET.
 */
export function getLocalDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates that a string matches YYYY-MM-DD and represents a real calendar date.
 * Parses then re-serializes to catch impossible dates like 2026-02-30 that the
 * Date constructor silently rolls over to the next month.
 */
function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00`); // Force local midnight interpretation
  if (isNaN(d.getTime())) return false;
  // Re-serialize and compare: rolled-over dates (e.g. Feb 30) won't match
  const [year, month, day] = dateStr.split("-").map(Number);
  return (
    d.getFullYear() === year &&
    d.getMonth() + 1 === month &&
    d.getDate() === day
  );
}

// ─── Cache Stampede Prevention ────────────────────────────────────────────────
// Store in-flight Promises per date so concurrent cache-miss requests share
// the same scrape instead of each spawning their own.

const inflightScrapes = new Map<string, Promise<EncodedBody>>();

// ─── Core Scraping Orchestrator ───────────────────────────────────────────────

/**
 * Runs the full two-layer scraping pipeline for a given date.
 * This function is called on a cache miss and is responsible for:
 *   1. Layer 1: fetch /menu-hours/ → get all location stubs
 *   2. Layer 2: fetch each location page in parallel → get full menu data
 *   3. Aggregate results, encode them and write to cache
 *
 * Uses Promise.allSettled so a single failed location doesn't break the
 * entire response — other locations will still be returned.
 *
 * @param date - "YYYY-MM-DD"
 * @returns Encoded DailyMenuResponse ready to send to the client
 */
async function fetchAndCacheMenuData(date: string): Promise<EncodedBody> {
  console.log(`[menu route] Starting full scrape pipeline for date: ${date}`);
  const startTime = Date.now();

  // ── Layer 1: Fetch location stubs ──
  const locationStubs = await scrapeMenuHours(date);

  if (locationStubs.length === 0) {
    // No locations found — return an empty response rather than throwing
    const emptyResponse: DailyMenuResponse = {
      date,
      fetchedAt: new Date().toISOString(),
      locations: [],
    };
    const encodedEmpty = await encodeJson(JSON.stringify(emptyResponse));
    menuCache.set(date, encodedEmpty, 30 * 60 * 1000); // Cache empties for 30 min
    return encodedEmpty;
  }

  // ── Layer 2: Fetch all location menus in parallel ──
  // We use Promise.allSettled so one failing location doesn't kill the batch
  const settledResults = await Promise.allSettled(
    locationStubs.map((stub) => scrapeLocationMenu(stub))
  );

  const locations: DiningLocation[] = [];

  settledResults.forEach((result, i) => {
    const stub = locationStubs[i]!;
    if (result.status === "fulfilled") {
      locations.push(result.value);
    } else {
      console.error(
        `[menu route] Failed to scrape location "${stub.name}": ${result.reason}`
      );
      // Include a placeholder with empty meals so the frontend knows the
      // location exists but data could not be loaded
      locations.push({
        slug: stub.slug,
        name: stub.name,
        url: stub.url,
        isOpen: stub.isOpen,
        meals: [],
      });
    }
  });

  const elapsed = Date.now() - startTime;
  console.log(
    `[menu route] Scrape complete in ${elapsed}ms — ${locations.length} location(s)`
  );

  const response: DailyMenuResponse = {
    date,
    fetchedAt: new Date().toISOString(),
    locations,
  };

  const encoded = await encodeJson(JSON.stringify(response));
  menuCache.set(date, encoded);
  return encoded;
}

/**
 * Returns a shared in-flight Promise for the given date, or starts a new scrape.
 * Prevents the thundering herd: if many requests arrive at a cache miss
 * simultaneously, they all share one scrape instead of spawning many scrapers.
 *
 * Exported so server/index.ts can call it for startup pre-warming.
 */
export function getScrapePromise(date: string): Promise<EncodedBody> {
  const existing = inflightScrapes.get(date);
  if (existing) return existing;

  const promise = fetchAndCacheMenuData(date).finally(() => {
    inflightScrapes.delete(date);
  });
  inflightScrapes.set(date, promise);
  return promise;
}

// ─── Rate limiter for /refresh (#19) ─────────────────────────────────────────
// The refresh endpoint triggers expensive parallel scrapes. Limit to 5/minute.
const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Refresh rate limit exceeded. Please wait before refreshing again." },
});

// ─── GET /api/menu ────────────────────────────────────────────────────────────

menuRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dateParam = req.query.date as string | undefined;
    const date = dateParam ?? getLocalDateString(); // Eastern Time — not UTC

    if (!isValidDate(date)) {
      res.status(400).json({
        error: "Invalid date parameter. Expected format: YYYY-MM-DD",
        received: dateParam,
      });
      return;
    }

    try {
      // ── 1. Fresh cache HIT ─────────────────────────────────────────────────
      const fresh = menuCache.get(date);
      if (fresh) {
        res.setHeader("X-Cache", "HIT");
        sendEncoded(req, res, fresh);
        return;
      }

      // ── 2. Stale-while-revalidate ──────────────────────────────────────────
      // If a previous scrape's data exists but has expired, serve it instantly
      // and trigger a background refresh. The user sees data immediately (~0ms)
      // instead of waiting ~8s for a full re-scrape.
      const stale = menuCache.getStale(date);
      if (stale) {
        res.setHeader("X-Cache", "STALE");
        sendEncoded(req, res, stale);
        // Background refresh — don't block the response
        getScrapePromise(date).catch((err) =>
          console.error("[menu route] Background SWR refresh failed:", err)
        );
        return;
      }

      // ── 3. Cold miss — no data at all, must wait for full scrape ──────────
      res.setHeader("X-Cache", "MISS");
      sendEncoded(req, res, await getScrapePromise(date));
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/menu/refresh ────────────────────────────────────────────────────

menuRouter.get(
  "/refresh",
  refreshRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dateParam = req.query.date as string | undefined;
    const date = dateParam ?? getLocalDateString(); // Eastern Time — not UTC

    if (!isValidDate(date)) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }

    try {
      menuCache.invalidate(date);
      inflightScrapes.delete(date); // Also clear any in-flight scrape
      const menu = await getScrapePromise(date);
      // Splice in the serialized menu instead of parsing it back into objects.
      // `date` is safe to embed: isValidDate() allows only digits and dashes.
      const body = await encodeJson(
        `{"message":"Cache refreshed for ${date}","data":${menu.json.toString()}}`
      );
      sendEncoded(req, res, body);
    } catch (err) {
      next(err);
    }
  }
);
