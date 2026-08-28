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
   * Retrieves a cached menu response if it exists AND has not expired.
   * Expired entries are intentionally NOT evicted here — they remain in the
   * store so getStale() can serve them for the stale-while-revalidate pattern.
   *
   * @param date - "YYYY-MM-DD" cache key
   * @returns Fresh DailyMenuResponse, or null if missing/expired
   */
  get(date: string): DailyMenuResponse | null {
    const entry = this.store.get(date);
    if (!entry) return null;

    const isExpired = Date.now() - entry.cachedAt > entry.ttlMs;
    if (isExpired) {
      console.log(`[menuCache] Cache EXPIRED for ${date} (stale data retained for SWR)`);
      return null;
    }

    const ageSeconds = Math.round((Date.now() - entry.cachedAt) / 1000);
    console.log(`[menuCache] Cache HIT for ${date} (age: ${ageSeconds}s)`);
    return entry.data;
  }

  /**
   * Returns any stored data for a date — fresh or expired — without evicting it.
   * Used by the stale-while-revalidate strategy: the GET handler can serve
   * instantly from stale data while triggering a background re-scrape.
   *
   * @param date - "YYYY-MM-DD" cache key
   * @returns Stored DailyMenuResponse regardless of TTL, or null if never fetched
   */
  getStale(date: string): DailyMenuResponse | null {
    const entry = this.store.get(date);
    if (!entry) return null;
    const ageSeconds = Math.round((Date.now() - entry.cachedAt) / 1000);
    console.log(`[menuCache] Serving STALE data for ${date} (age: ${ageSeconds}s, background refresh triggered)`);
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

  /**
   * Evicts entries that have exceeded their TTL + a 4-hour grace window.
   *
   * WHY a grace window?
   * get() no longer immediately deletes expired entries so that getStale()
   * can serve them for the stale-while-revalidate pattern. Without a grace
   * window, yesterday's menu data would stay in memory indefinitely.
   * 4 hours is generous — menus don't change mid-day, so stale data from
   * the same day is always useful. Yesterday's data becomes useless by ~4am.
   */
  sweep(): void {
    const now = Date.now();
    const GRACE_MS = 4 * 60 * 60 * 1000; // 4 hours
    for (const [date, entry] of this.store) {
      if (now - entry.cachedAt > entry.ttlMs + GRACE_MS) {
        this.store.delete(date);
        console.log(`[menuCache] Sweep evicted stale entry for date: ${date}`);
      }
    }
  }
}

/**
 * Singleton cache instance — shared across all requests within a Cloud Function
 * instance's lifetime.
 */
export const menuCache = new MenuCache();

// ─── Periodic Sweep (#10) ─────────────────────────────────────────────────────
// Evict expired entries every 30 minutes so dates that are fetched once and
// never requested again don't remain in the Map indefinitely.
setInterval(() => menuCache.sweep(), 30 * 60 * 1000).unref();

