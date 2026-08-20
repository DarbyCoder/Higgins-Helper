/**
 * @file src/stores/useUIStore.ts
 * @description Zustand slice for ephemeral UI state.
 *
 * Manages:
 *   - Active dining location selection
 *   - Active meal period tab
 *   - Menu search/filter query
 *   - Dietary filter toggles
 *   - Toast notifications (for surfacing async errors to the user)
 *
 * NOT persisted — all UI state resets on page load.
 */

import { create } from "zustand";

// ─── Toast type ───────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  type: "error" | "info" | "success";
}

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

  /** Currently displayed toast notifications. */
  toasts: Toast[];

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

  /** Shows a temporary toast notification. Auto-dismisses after 5 seconds. */
  showToast: (message: string, type?: Toast["type"]) => void;

  /** Dismisses a toast by its ID. */
  dismissToast: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>((set, get) => ({
  activeLocationSlug: null,
  activeMealPeriod: null,
  searchQuery: "",
  activeDietaryFilters: [],
  toasts: [],

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

  showToast: (message, type = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

