/**
 * @file src/stores/useFoodLogStore.ts
 * @description Zustand slice for the user's daily food log.
 *
 * This is the core tracking store. It manages:
 *   - Adding, removing, and updating food log entries
 *   - Computing and maintaining macro totals (kept in sync at all times)
 *   - Persisting the entire log to localStorage via Zustand persist middleware
 *
 * DATA MODEL:
 *   foodLog: Record<"YYYY-MM-DD", DailyFoodLog>
 *     - Each key is a date string; the value holds that day's entries and totals.
 *     - Totals are ALWAYS recomputed from entries[] — never manually edited.
 *       This ensures consistency even if entries are updated or removed.
 *
 * PERSISTENCE:
 *   The food log is persisted to localStorage under the key "higgins-food-log".
 *   A 90-day rolling window is enforced to prevent unbounded storage growth.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  DailyFoodLog,
  LoggedFoodEntry,
  MacroTotals,
  MenuItem,
  MealSlot,
} from "../types/index.js";
import { toLocalDateString } from "./useDateStore.js";

// ─── Rolling Window Constant ──────────────────────────────────────────────────

/** Number of days to retain in localStorage before pruning old entries. */
const LOG_RETENTION_DAYS = 90;

// ─── Macro Computation ───────────────────────────────────────────────────────

/**
 * Computes aggregate MacroTotals from an array of log entries.
 * This is the single source of truth for totals — always derived, never stored.
 *
 * @param entries - The entries to sum
 * @returns MacroTotals with all values rounded to 2 decimal places
 */
function computeTotals(entries: LoggedFoodEntry[]): MacroTotals {
  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      totalFat: acc.totalFat + entry.totalFat,
      totalCarbs: acc.totalCarbs + entry.totalCarbs,
      sodium: acc.sodium + entry.sodium,
      fiber: acc.fiber + entry.fiber,
    }),
    { calories: 0, protein: 0, totalFat: 0, totalCarbs: 0, sodium: 0, fiber: 0 }
  );

  // Round all values to avoid floating-point drift
  return {
    calories: Math.round(totals.calories),
    protein: Number(totals.protein.toFixed(1)),
    totalFat: Number(totals.totalFat.toFixed(1)),
    totalCarbs: Number(totals.totalCarbs.toFixed(1)),
    sodium: Math.round(totals.sodium),
    fiber: Number(totals.fiber.toFixed(1)),
  };
}

/**
 * Returns an empty MacroTotals object (all zeros).
 * Used as the initial state for a day with no entries.
 */
function emptyTotals(): MacroTotals {
  return {
    calories: 0,
    protein: 0,
    totalFat: 0,
    totalCarbs: 0,
    sodium: 0,
    fiber: 0,
  };
}

/**
 * Ensures a DailyFoodLog exists for the given date, creating it if absent.
 * Returns the (possibly updated) foodLog record.
 */
function ensureDayExists(
  foodLog: Record<string, DailyFoodLog>,
  date: string
): Record<string, DailyFoodLog> {
  if (foodLog[date]) return foodLog;
  return {
    ...foodLog,
    [date]: { date, entries: [], totals: emptyTotals() },
  };
}

/**
 * Prunes log entries older than LOG_RETENTION_DAYS from the store.
 * Keeps the store from growing indefinitely in localStorage.
 */
function pruneOldEntries(
  foodLog: Record<string, DailyFoodLog>
): Record<string, DailyFoodLog> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
  const cutoffStr = toLocalDateString(cutoff);

  const pruned: Record<string, DailyFoodLog> = {};
  for (const [date, log] of Object.entries(foodLog)) {
    if (date >= cutoffStr) {
      pruned[date] = log;
    }
  }
  return pruned;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface FoodLogState {
  /**
   * The complete food log, keyed by "YYYY-MM-DD" date strings.
   * Persisted to localStorage.
   */
  foodLog: Record<string, DailyFoodLog>;

  /**
   * Adds a menu item to the food log for the specified date and meal slot.
   * Creates the DailyFoodLog entry for the date if it doesn't exist yet.
   * Totals are recomputed automatically.
   *
   * @param date - "YYYY-MM-DD"
   * @param mealSlot - Which meal this belongs to (breakfast/lunch/dinner/snack)
   * @param item - The MenuItem being logged (from the scraped menu data)
   * @param locationName - The dining hall it came from (for display)
   * @param servings - How many servings (default 1)
   */
  addFoodEntry: (
    date: string,
    mealSlot: MealSlot,
    item: MenuItem,
    locationName: string,
    servings?: number
  ) => void;

  /**
   * Removes a log entry by its unique entry ID.
   * Totals are recomputed automatically.
   *
   * @param date - "YYYY-MM-DD"
   * @param entryId - The UUID of the LoggedFoodEntry to remove
   */
  removeFoodEntry: (date: string, entryId: string) => void;

  /**
   * Updates the serving count for an existing log entry.
   * All macro totals are scaled proportionally and the day totals recomputed.
   *
   * @param date - "YYYY-MM-DD"
   * @param entryId - The UUID of the LoggedFoodEntry to update
   * @param newServings - The new quantity (must be > 0)
   */
  updateServings: (
    date: string,
    entryId: string,
    newServings: number
  ) => void;

  /**
   * Returns the MacroTotals for a given date, or all-zero totals if the date
   * has no logged entries.
   *
   * @param date - "YYYY-MM-DD"
   */
  getDailyTotals: (date: string) => MacroTotals;

  /**
   * Returns all log entries for a given date, or an empty array.
   *
   * @param date - "YYYY-MM-DD"
   */
  getDailyEntries: (date: string) => LoggedFoodEntry[];

  /**
   * Returns entries for a specific meal slot on a given date.
   *
   * @param date - "YYYY-MM-DD"
   * @param mealSlot - "breakfast" | "lunch" | "dinner" | "snack"
   */
  getEntriesForMeal: (date: string, mealSlot: MealSlot) => LoggedFoodEntry[];

  /**
   * Removes all entries for a given date (e.g., "Clear today's log").
   */
  clearDayLog: (date: string) => void;

  /**
   * Manually triggers pruning of old log entries.
   * Called on app startup via a useEffect.
   */
  pruneOldLogs: () => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useFoodLogStore = create<FoodLogState>()(
  persist(
    (set, get) => ({
      foodLog: {},

      // ── Add Entry ──────────────────────────────────────────────────────────
      addFoodEntry: (date, mealSlot, item, locationName, servings = 1) => {
        const validServings = Math.max(0.25, servings); // Minimum 0.25 servings

        // Pre-multiply all macro values by serving count
        const entry: LoggedFoodEntry = {
          id: uuidv4(),
          menuItemId: item.id,
          menuItemName: item.name,
          locationName,
          mealSlot,
          servings: validServings,
          calories: Math.round(item.calories * validServings),
          protein: Number((item.protein * validServings).toFixed(1)),
          totalFat: Number((item.totalFat * validServings).toFixed(1)),
          totalCarbs: Number((item.totalCarbs * validServings).toFixed(1)),
          sodium: Math.round(item.sodium * validServings),
          fiber: Number((item.fiber * validServings).toFixed(1)),
          loggedAt: new Date().toISOString(),
        };

        set((state) => {
          const log = ensureDayExists(state.foodLog, date);
          const day = log[date]!;
          const updatedEntries = [...day.entries, entry];
          return {
            foodLog: {
              ...log,
              [date]: {
                ...day,
                entries: updatedEntries,
                totals: computeTotals(updatedEntries),
              },
            },
          };
        });
      },

      // ── Remove Entry ───────────────────────────────────────────────────────
      removeFoodEntry: (date, entryId) => {
        set((state) => {
          const day = state.foodLog[date];
          if (!day) return state; // Nothing to remove

          const updatedEntries = day.entries.filter((e) => e.id !== entryId);
          return {
            foodLog: {
              ...state.foodLog,
              [date]: {
                ...day,
                entries: updatedEntries,
                totals: computeTotals(updatedEntries),
              },
            },
          };
        });
      },

      // ── Update Servings ────────────────────────────────────────────────────
      updateServings: (date, entryId, newServings) => {
        const validServings = Math.max(0.25, newServings);

        set((state) => {
          const day = state.foodLog[date];
          if (!day) return state;

          const updatedEntries = day.entries.map((entry) => {
            if (entry.id !== entryId) return entry;

            // The entry stores macros for the CURRENT serving count.
            // To get per-unit macros: divide by current servings.
            // Then multiply by the new serving count.
            const ratio = validServings / entry.servings;

            return {
              ...entry,
              servings: validServings,
              calories: Math.round(entry.calories * ratio),
              protein: Number((entry.protein * ratio).toFixed(1)),
              totalFat: Number((entry.totalFat * ratio).toFixed(1)),
              totalCarbs: Number((entry.totalCarbs * ratio).toFixed(1)),
              sodium: Math.round(entry.sodium * ratio),
              fiber: Number((entry.fiber * ratio).toFixed(1)),
            };
          });

          return {
            foodLog: {
              ...state.foodLog,
              [date]: {
                ...day,
                entries: updatedEntries,
                totals: computeTotals(updatedEntries),
              },
            },
          };
        });
      },

      // ── Getters ────────────────────────────────────────────────────────────
      getDailyTotals: (date) => {
        return get().foodLog[date]?.totals ?? emptyTotals();
      },

      getDailyEntries: (date) => {
        return get().foodLog[date]?.entries ?? [];
      },

      getEntriesForMeal: (date, mealSlot) => {
        return (
          get()
            .foodLog[date]?.entries.filter((e) => e.mealSlot === mealSlot) ?? []
        );
      },

      // ── Clear Day ──────────────────────────────────────────────────────────
      clearDayLog: (date) => {
        set((state) => ({
          foodLog: {
            ...state.foodLog,
            [date]: { date, entries: [], totals: emptyTotals() },
          },
        }));
      },

      // ── Prune Old Logs ─────────────────────────────────────────────────────
      pruneOldLogs: () => {
        set((state) => ({ foodLog: pruneOldEntries(state.foodLog) }));
      },
    }),

    // ── Persist Configuration ──────────────────────────────────────────────
    {
      name: "higgins-food-log", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the food log data; no need to persist computed state
      partialize: (state) => ({ foodLog: state.foodLog }),
    }
  )
);
