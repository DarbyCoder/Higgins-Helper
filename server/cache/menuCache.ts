/**
 * @file server/cache/menuCache.ts
 * @description In-memory cache for scraped menu data with per-entry TTL.
 *
 * Why in-memory rather than Redis?
 * For a single Cloud Function instance, in-memory is simpler and has zero
 * latency overhead. Cloud Functions warm instances will hit the cache; cold
 * starts will re-scrape. The 1-hour TTL prevents serving stale menus within
 * a session while keeping scraping polite.
 *
 * Cache key: the date string "YYYY-MM-DD".
 * This means yesterday's menu is never confused with today's.
 */

import type { CacheEntry, DailyMenuResponse } from "../types/index.js";

/** Default cache TTL: 1 hour in milliseconds. */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

class MenuCache {
  /** Internal store: date string → cache entry */
  private readonly store = new Map<string, CacheEntry<DailyMenuResponse>>();

  /**
   * Retrieves a cached menu response if it exists and has not expired.
   *
   * @param date - "YYYY-MM-DD" cache key
   * @returns The cached DailyMenuResponse, or null on a miss/expiry
   */
  get(date: string): DailyMenuResponse | null {
    const entry = this.store.get(date);
    if (!entry) return null;

    const isExpired = Date.now() - entry.cachedAt > entry.ttlMs;
    if (isExpired) {
      this.store.delete(date);
      console.log(`[menuCache] Cache expired and evicted for date: ${date}`);
      return null;
    }

    const ageSeconds = Math.round((Date.now() - entry.cachedAt) / 1000);
    console.log(`[menuCache] Cache HIT for ${date} (age: ${ageSeconds}s)`);
    return entry.data;
  }

  /**
   * Stores a menu response in the cache.
   *
   * @param date - "YYYY-MM-DD" cache key
   * @param data - The DailyMenuResponse to cache
   * @param ttlMs - Time-to-live in ms (defaults to 1 hour)
   */
  set(
    date: string,
    data: DailyMenuResponse,
    ttlMs: number = DEFAULT_TTL_MS
  ): void {
    this.store.set(date, {
      data,
      cachedAt: Date.now(),
      ttlMs,
    });
    console.log(
      `[menuCache] Cached menu for ${date} (TTL: ${ttlMs / 1000 / 60}min, ` +
        `${data.locations.length} location(s))`
    );
  }

  /**
   * Explicitly removes a date from the cache (useful for forced refreshes).
   */
  invalidate(date: string): void {
    this.store.delete(date);
    console.log(`[menuCache] Invalidated cache for date: ${date}`);
  }

  /**
   * Clears the entire cache — useful for testing or admin endpoints.
   */
  clear(): void {
    this.store.clear();
    console.log("[menuCache] Cache cleared");
  }

  /** Returns the number of currently cached dates. */
  get size(): number {
    return this.store.size;
  }
}

/**
 * Singleton cache instance — shared across all requests within a Cloud Function
 * instance's lifetime.
 */
export const menuCache = new MenuCache();
