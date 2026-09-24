/**
 * @file src/stores/useDateStore.ts
 * @description Zustand slice managing the currently selected date.
 *
 * NOT persisted — resets to today on every app launch.
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

  /** Navigate to the next calendar day. */
  goToNextDay: () => void;
  /** Navigate to the previous calendar day. */
  goToPrevDay: () => void;
  /** Jump to today. */
  goToToday: () => void;
  /** Directly set the selected date. */
  setSelectedDate: (date: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDateStore = create<DateState>((set) => ({
  selectedDate: toLocalDateString(),

  goToNextDay: () =>
    set((state) => ({ selectedDate: offsetDate(state.selectedDate, 1) })),

  goToPrevDay: () =>
    set((state) => ({ selectedDate: offsetDate(state.selectedDate, -1) })),

  goToToday: () => set({ selectedDate: toLocalDateString() }),

  setSelectedDate: (date) => set({ selectedDate: date }),
}));
