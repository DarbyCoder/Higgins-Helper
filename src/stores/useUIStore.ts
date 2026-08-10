/**
 * @file src/stores/useUIStore.ts
 * @description Zustand slice for ephemeral UI state.
 *
 * Manages:
 *   - Active dining location selection
 *   - Active meal period tab
 *   - Menu search/filter query
 *   - Dietary filter toggles
 *
 * NOT persisted — all UI state resets on page load.
 */

import { create } from "zustand";

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface UIState {
  /** Slug of the currently expanded dining location, or null if none. */
  activeLocationSlug: string | null;

  /** Name of the currently active meal period tab (e.g. "Breakfast"). */
  activeMealPeriod: string | null;

  /** Search string for filtering menu items by name. */
  searchQuery: string;

  /**
   * Active dietary filter icon strings (e.g. ["vegan", "made_without_gluten"]).
   * Items must match ALL active filters to be shown.
   */
  activeDietaryFilters: string[];

  // ── Actions ──────────────────────────────────────────────────────────────

  setActiveLocation: (slug: string | null) => void;
  setActiveMealPeriod: (meal: string | null) => void;
  setSearchQuery: (query: string) => void;

  /** Adds a dietary filter if not already active. */
  addDietaryFilter: (icon: string) => void;

  /** Removes a dietary filter. */
  removeDietaryFilter: (icon: string) => void;

  /** Toggles a dietary filter on/off. */
  toggleDietaryFilter: (icon: string) => void;

  /** Clears all dietary filters. */
  clearDietaryFilters: () => void;

  /** Resets all UI state to defaults. */
  resetUI: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>((set, get) => ({
  activeLocationSlug: null,
  activeMealPeriod: null,
  searchQuery: "",
  activeDietaryFilters: [],

  setActiveLocation: (slug) => set({ activeLocationSlug: slug }),
  setActiveMealPeriod: (meal) => set({ activeMealPeriod: meal }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addDietaryFilter: (icon) => {
    const current = get().activeDietaryFilters;
    if (!current.includes(icon)) {
      set({ activeDietaryFilters: [...current, icon] });
    }
  },

  removeDietaryFilter: (icon) => {
    set({
      activeDietaryFilters: get().activeDietaryFilters.filter((f) => f !== icon),
    });
  },

  toggleDietaryFilter: (icon) => {
    const current = get().activeDietaryFilters;
    if (current.includes(icon)) {
      set({ activeDietaryFilters: current.filter((f) => f !== icon) });
    } else {
      set({ activeDietaryFilters: [...current, icon] });
    }
  },

  clearDietaryFilters: () => set({ activeDietaryFilters: [] }),

  resetUI: () =>
    set({
      activeLocationSlug: null,
      activeMealPeriod: null,
      searchQuery: "",
      activeDietaryFilters: [],
    }),
}));
