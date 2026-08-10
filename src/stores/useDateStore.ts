/**
 * @file src/stores/useDateStore.ts
 * @description Zustand slice managing the currently selected date AND an
 * optional "simulated today" override.
 *
 * The simulated today feature lets the user pretend the app thinks it's a
 * different date — useful for testing future menus or past log entries without
 * changing the system clock. When active, all "today" logic uses the simulated
 * date instead of the real system date.
 *
 * NOT persisted — resets on every app launch.
 */

import { create } from "zustand";

// ─── Date Utilities ───────────────────────────────────────────────────────────

/** Returns a date as "YYYY-MM-DD" in the user's LOCAL timezone. */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Offsets a date string by `days` and returns a new date string. */
export function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`); // Noon anchor avoids DST issues
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface DateState {
  /** The currently viewed date in "YYYY-MM-DD" format. */
  selectedDate: string;

  /**
   * When non-null, the app treats this date as "today" instead of the real
   * system date. Useful for testing menus/logs on other dates.
   */
  simulatedToday: string | null;

  /** Navigate to the next calendar day. */
  goToNextDay: () => void;
  /** Navigate to the previous calendar day. */
  goToPrevDay: () => void;
  /** Jump to "today" (respects simulatedToday if set). */
  goToToday: () => void;
  /** Directly set the selected date. */
  setSelectedDate: (date: string) => void;

  /** Enables date simulation and sets both selectedDate and simulatedToday. */
  setSimulatedToday: (date: string) => void;
  /** Clears the simulation and snaps selectedDate back to real today. */
  clearSimulatedToday: () => void;

  /**
   * Returns the effective "today" — the simulated date if active, otherwise
   * the real system date. Use this everywhere the app needs to know "today".
   */
  getEffectiveToday: () => string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDateStore = create<DateState>((set, get) => ({
  selectedDate: toLocalDateString(),
  simulatedToday: null,

  goToNextDay: () =>
    set((state) => ({ selectedDate: offsetDate(state.selectedDate, 1) })),

  goToPrevDay: () =>
    set((state) => ({ selectedDate: offsetDate(state.selectedDate, -1) })),

  goToToday: () =>
    set((state) => ({
      selectedDate: state.simulatedToday ?? toLocalDateString(),
    })),

  setSelectedDate: (date) => set({ selectedDate: date }),

  setSimulatedToday: (date) =>
    set({ simulatedToday: date, selectedDate: date }),

  clearSimulatedToday: () =>
    set({ simulatedToday: null, selectedDate: toLocalDateString() }),

  getEffectiveToday: () =>
    get().simulatedToday ?? toLocalDateString(),
}));
