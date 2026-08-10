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
import type { DailyMenuResponse, DiningLocation } from "../types/index.js";
import { scrapeMenuHours } from "../scraper/menuHoursScraper.js";
import { scrapeLocationMenu } from "../scraper/locationMenuScraper.js";
import { menuCache } from "../cache/menuCache.js";

export const menuRouter = Router();

// ─── Date Validation ─────────────────────────────────────────────────────────

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates that a string matches YYYY-MM-DD and represents a real calendar date.
 */
function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

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

      // ── Cache miss: run scraping pipeline ──
      res.setHeader("X-Cache", "MISS");
      const data = await fetchAndCacheMenuData(date);
      res.json(data);
    } catch (err) {
      next(err); // Delegate to Express error handler
    }
  }
);

// ─── GET /api/menu/refresh ────────────────────────────────────────────────────

menuRouter.get(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dateParam = req.query.date as string | undefined;
    const date = dateParam ?? new Date().toISOString().slice(0, 10);

    if (!isValidDate(date)) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }

    try {
      menuCache.invalidate(date);
      const data = await fetchAndCacheMenuData(date);
      res.json({ message: `Cache refreshed for ${date}`, data });
    } catch (err) {
      next(err);
    }
  }
);
