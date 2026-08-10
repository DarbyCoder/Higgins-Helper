/**
 * @file src/stores/useMenuStore.ts
 * @description Zustand slice managing the scraped menu data.
 *
 * Handles fetching from /api/menu, loading/error states, and in-memory
 * caching of fetched results keyed by date (separate from the server-side
 * cache — this prevents re-fetching if the user navigates away and returns).
 *
 * Not persisted to localStorage — menu data should always be fresh from the
 * server, which handles its own 1-hour caching layer.
 */

import { create } from "zustand";
import type { DailyMenuResponse } from "../types/index.js";

// ─── API Layer ────────────────────────────────────────────────────────────────

async function fetchMenuForDate(date: string): Promise<DailyMenuResponse> {
  // Relative URL — routes through Vite proxy in dev, same-origin in prod
  const url = `/api/menu?date=${date}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Menu API returned ${response.status}: ${response.statusText}`
    );
  }

  return response.json() as Promise<DailyMenuResponse>;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface MenuState {
  /** The currently loaded menu data, or null if not yet fetched. */
  menuData: DailyMenuResponse | null;

  /** True while a scrape/fetch is in flight. */
  isLoading: boolean;

  /** Error message string, or null if no error. */
  error: string | null;

  /**
   * Client-side in-memory cache of menu responses keyed by date.
   * Prevents re-fetching the same date during a single user session.
   */
  menuCache: Record<string, DailyMenuResponse>;

  /**
   * Fetches the menu for the given date.
   * Checks the client-side cache first; falls back to the API.
   *
   * @param date - "YYYY-MM-DD"
   */
  fetchMenu: (date: string) => Promise<void>;

  /** Clears the currently displayed menu (e.g. when switching dates). */
  clearMenu: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMenuStore = create<MenuState>((set, get) => ({
  menuData: null,
  isLoading: false,
  error: null,
  menuCache: {},

  fetchMenu: async (date: string) => {
    // ── Check client-side cache ──
    const cached = get().menuCache[date];
    if (cached) {
      set({ menuData: cached, error: null });
      return;
    }

    // ── Fetch from server ──
    set({ isLoading: true, error: null });

    try {
      const data = await fetchMenuForDate(date);

      set((state) => ({
        menuData: data,
        isLoading: false,
        menuCache: { ...state.menuCache, [date]: data },
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load menu data";
      console.error("[useMenuStore] fetchMenu error:", err);
      set({ error: message, isLoading: false });
    }
  },

  clearMenu: () => set({ menuData: null, error: null }),
}));
