/**
 * @file src/stores/useUIStore.ts
 * @description Zustand slice for ephemeral UI state.
 *
 * Manages:
 *   - Menu tab area (Clark dining vs. Worcester restaurants)
 *   - Active dining location selection
 *   - Active meal period tab
 *   - Menu search/filter query
 *   - Dietary filter toggles
 *   - Toast notifications (for surfacing async errors to the user)
 *   - Whether the intro tour is showing
 *
 * NOT persisted — all UI state resets on page load.
 */

import { create } from "zustand";

// ─── Toast type ───────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  type: "error" | "info" | "success";
  /** A button on the toast, e.g. Undo. Tapping it also dismisses the toast. */
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  run: () => void;
}

/** Which side of the Menu tab is showing. */
export type MenuArea = "clark" | "worcester";

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface UIState {
  /** Menu tab side: Higgins dining ("clark") or nearby restaurants ("worcester"). */
  menuArea: MenuArea;

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

  /** True while the intro tour overlay is showing. */
  isTourOpen: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────

  setMenuArea: (area: MenuArea) => void;
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

  /**
   * The profile diet the filters were last set from (sorted icons, joined).
   * The menu re-applies the profile's diets only when they change, so chips
   * the user changes by hand stay as they are.
   */
  dietFiltersFrom: string | null;

  /** Sets the filters from the profile's diets. */
  applyProfileDiets: (icons: string[]) => void;

  /** Resets all UI state to defaults. */
  resetUI: () => void;

  /** Shows a temporary toast notification. Auto-dismisses after 5 seconds. */
  showToast: (message: string, type?: Toast["type"], action?: ToastAction) => void;

  /** Dismisses a toast by its ID. */
  dismissToast: (id: string) => void;

  /** Shows the intro tour (on first launch, or from Profile → Replay). */
  openTour: () => void;

  /** Hides the intro tour. Does not record it as seen — see markIntroSeen. */
  closeTour: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>((set, get) => ({
  menuArea: "clark",
  activeLocationSlug: null,
  activeMealPeriod: null,
  searchQuery: "",
  activeDietaryFilters: [],
  toasts: [],
  isTourOpen: false,

  setMenuArea: (area) => set({ menuArea: area }),
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

  dietFiltersFrom: null,

  applyProfileDiets: (icons) => {
    const key = [...icons].sort().join(",");
    if (get().dietFiltersFrom === key) return;
    set({ activeDietaryFilters: [...new Set(icons)], dietFiltersFrom: key });
  },

  resetUI: () =>
    set({
      menuArea: "clark",
      activeLocationSlug: null,
      activeMealPeriod: null,
      searchQuery: "",
      activeDietaryFilters: [],
      dietFiltersFrom: null,
    }),

  showToast: (message, type = "info", action) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type, action }] }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  openTour: () => set({ isTourOpen: true }),
  closeTour: () => set({ isTourOpen: false }),
}));

