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
import { menuCache } from "../cache/menuCache.js";

export const menuRouter = Router();

// ─── Date Validation (#4) ─────────────────────────────────────────────────────

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

// ─── Cache Stampede Prevention (#9) ──────────────────────────────────────────
// Store in-flight Promises per date so concurrent cache-miss requests share
// the same scrape instead of each spawning their own.

const inflightScrapes = new Map<string, Promise<DailyMenuResponse>>();

// ─── Core Scraping Orchestrator ───────────────────────────────────────────────

/**
 * Runs the full two-layer scraping pipeline for a given date.
 * This function is called on a cache miss and is responsible for:
 *   1. Layer 1: fetch /menu-hours/ → get all location stubs
 *   2. Layer 2: fetch each location page in parallel → get full menu data
 *   3. Aggregate results and write to cache
 *
 * Uses Promise.allSettled so a single failed location doesn't break the
 * entire response — other locations will still be returned.
 *
 * @param date - "YYYY-MM-DD"
 * @returns DailyMenuResponse ready to send to the client
 */
async function fetchAndCacheMenuData(date: string): Promise<DailyMenuResponse> {
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
    menuCache.set(date, emptyResponse, 30 * 60 * 1000); // Cache empties for 30 min
    return emptyResponse;
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

  menuCache.set(date, response);
  return response;
}

/**
 * Returns a shared in-flight Promise for the given date, or starts a new scrape.
 * Prevents the thundering herd: if 50 requests arrive at a cache miss simultaneously,
 * they all share one scrape instead of spawning 50 parallel scrapers.
 */
function getScrapePromise(date: string): Promise<DailyMenuResponse> {
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
    // ── Validate the `date` query param ──
    const dateParam = req.query.date as string | undefined;

    // Default to today if no date provided
    const date = dateParam ?? new Date().toISOString().slice(0, 10);

    if (!isValidDate(date)) {
      res.status(400).json({
        error: "Invalid date parameter. Expected format: YYYY-MM-DD",
        received: dateParam,
      });
      return;
    }

    try {
      // ── Cache lookup ──
      const cached = menuCache.get(date);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.json(cached);
        return;
      }

      // ── Cache miss: run scraping pipeline (shared in-flight Promise) ──
      res.setHeader("X-Cache", "MISS");
      const data = await getScrapePromise(date);
      res.json(data);
    } catch (err) {
      next(err); // Delegate to Express error handler
    }
  }
);

// ─── GET /api/menu/refresh ────────────────────────────────────────────────────

menuRouter.get(
  "/refresh",
  refreshRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dateParam = req.query.date as string | undefined;
    const date = dateParam ?? new Date().toISOString().slice(0, 10);

    if (!isValidDate(date)) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }

    try {
      menuCache.invalidate(date);
      inflightScrapes.delete(date); // Also clear any in-flight scrape
      const data = await getScrapePromise(date);
      res.json({ message: `Cache refreshed for ${date}`, data });
    } catch (err) {
      next(err);
    }
  }
);


