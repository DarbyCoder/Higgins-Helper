/**
 * @file src/stores/useFoodLogStore.ts
 * @description Zustand slice for the user's daily food log.
 *
 * Source of truth: Cloud Firestore (users/{uid}/foodLogs/{YYYY-MM-DD}).
 * localStorage persist middleware keeps a copy on the device: it gives a fast
 * first paint, and it's what spares useFirestoreSync from re-downloading the log
 * on every open. `logSync` records whose copy it is and how fresh it is.
 *
 * All mutating actions (add, remove, update, clear) apply changes to local state
 * immediately, then debounce-write the updated day document to Firestore.
 *
 * Nothing that comes down from Firestore removes a day: incoming days are merged
 * over the local ones. pruneOldLogs only trims this device's copy, never Firestore,
 * and useFirestoreSync reloads a pruned day when it's selected.
 *
 * DATA MODEL:
 *   foodLog: Record<"YYYY-MM-DD", DailyFoodLog>
 *     - Each key is a date string; the value holds that day's entries and totals.
 *     - Totals are ALWAYS recomputed from entries[] — never manually edited.
 *       This ensures consistency even if entries are updated or removed.
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
import { setDailyFoodLog } from "@/firebase/firestoreService";
import { useAuthStore } from "./useAuthStore.js";

// ─── Rolling Window Constant ──────────────────────────────────────────────────

/** Number of days to retain before pruning old entries. */
const LOG_RETENTION_DAYS = 90;

// ─── Macro Computation ───────────────────────────────────────────────────────

/**
 * Computes aggregate MacroTotals from an array of log entries.
 * This is the single source of truth for totals — always derived, never stored.
 */
function computeTotals(entries: LoggedFoodEntry[]): MacroTotals {
  const totals = entries.reduce(
    (acc, entry) => ({
      calories:   acc.calories   + entry.calories,
      protein:    acc.protein    + entry.protein,
      totalFat:   acc.totalFat   + entry.totalFat,
      totalCarbs: acc.totalCarbs + entry.totalCarbs,
      sodium:     acc.sodium     + entry.sodium,
      fiber:      acc.fiber      + entry.fiber,
    }),
    { calories: 0, protein: 0, totalFat: 0, totalCarbs: 0, sodium: 0, fiber: 0 }
  );

  return {
    calories:   Math.round(totals.calories),
    protein:    Number(totals.protein.toFixed(1)),
    totalFat:   Number(totals.totalFat.toFixed(1)),
    totalCarbs: Number(totals.totalCarbs.toFixed(1)),
    sodium:     Math.round(totals.sodium),
    fiber:      Number(totals.fiber.toFixed(1)),
  };
}

function emptyTotals(): MacroTotals {
  return { calories: 0, protein: 0, totalFat: 0, totalCarbs: 0, sodium: 0, fiber: 0 };
}

function ensureDayExists(
  foodLog: Record<string, DailyFoodLog>,
  date: string
): Record<string, DailyFoodLog> {
  if (foodLog[date]) return foodLog;
  return { ...foodLog, [date]: { date, entries: [], totals: emptyTotals() } };
}

function pruneOldEntries(
  foodLog: Record<string, DailyFoodLog>
): Record<string, DailyFoodLog> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
  const cutoffStr = toLocalDateString(cutoff);

  const pruned: Record<string, DailyFoodLog> = {};
  for (const [date, log] of Object.entries(foodLog)) {
    if (date >= cutoffStr) pruned[date] = log;
  }
  return pruned;
}

// ─── Stable empty array constant (#6) ────────────────────────────────────────
// Using `?? []` in getters creates a new array reference on every call,
// breaking React memoization for components that depend on these arrays.
const EMPTY_ENTRIES: LoggedFoodEntry[] = Object.freeze([]) as unknown as LoggedFoodEntry[];

// ─── Firestore debounce write ─────────────────────────────────────────────────

/**
 * Returns a per-store-instance debounce writer.
 * Defined as a factory so `writeTimers` lives inside the store closure (#26),
 * preventing timer state from leaking between user sessions on sign-out/sign-in.
 *
 * It also tracks which days have a write on its way (#25). A day doc is overwritten
 * whole, so until that write lands the local copy is the one that counts, and
 * anything read from Firestore for that day must not replace it.
 */
function createFirestoreWriter() {
  // writeTimers is now scoped to this factory invocation, not the module (#26)
  const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  // Date → id of its newest write. An older write finishing doesn't clear a newer one.
  const pendingWrites = new Map<string, number>();
  let nextWriteId = 0;

  return {
    scheduleFirestoreWrite(date: string, log: DailyFoodLog) {
      const uid = useAuthStore.getState().user?.uid;
      if (!uid) return;

      const writeId = ++nextWriteId;
      pendingWrites.set(date, writeId);

      clearTimeout(writeTimers[date]);
      writeTimers[date] = setTimeout(() => {
        setDailyFoodLog(uid, date, log)
          .catch(console.error)
          .finally(() => {
            if (pendingWrites.get(date) === writeId) pendingWrites.delete(date);
          });
      }, 400); // 400ms debounce
    },

    hasPendingWrite: (date: string) => pendingWrites.has(date),

    /** The next account's days aren't held back by this one's writes, which still land. */
    forgetPendingWrites: () => pendingWrites.clear(),
  };
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

/** What this device knows about its copy of the log. */
export interface LogSyncState {
  /** The account this copy belongs to. A different uid must not see it or trust it. */
  uid: string;
  /** Newest `updatedAt` seen from Firestore (ms, server clock). Null if none yet. */
  cursorMs: number | null;
  /** When the last full sync finished (ms, this device's clock). */
  lastFullSyncAt: number;
}

interface FoodLogState {
  foodLog: Record<string, DailyFoodLog>;

  /**
   * Null until a full sync has finished on this device. Persisted in the same
   * localStorage entry as foodLog so the two can't disagree: cleared data loses
   * both, and a failed save keeps the older log with its older cursor, which just
   * re-fetches a little more next time.
   */
  logSync: LogSyncState | null;

  addFoodEntry: (
    date: string,
    mealSlot: MealSlot,
    item: MenuItem,
    locationName: string,
    servings?: number
  ) => void;

  removeFoodEntry: (date: string, entryId: string) => void;

  updateServings: (
    date: string,
    entryId: string,
    newServings: number
  ) => void;

  getDailyTotals:   (date: string) => MacroTotals;
  getDailyEntries:  (date: string) => LoggedFoodEntry[];
  getEntriesForMeal:(date: string, mealSlot: MealSlot) => LoggedFoodEntry[];

  clearDayLog: (date: string) => void;
  pruneOldLogs: () => void;

  /**
   * Hydrates the store from a Firestore snapshot (dict of date → DailyFoodLog).
   * Called by useFirestoreSync. Does NOT trigger Firestore writes.
   * Merges: days not in `logs` are left as they are.
   */
  hydrateFromFirestore: (logs: Record<string, DailyFoodLog>) => void;

  /**
   * Drops the cached log if it's recorded as another account's. Keeps a cache with
   * no recorded owner, which the first full sync merges over and takes over.
   */
  claimLogCache: (uid: string) => void;

  /**
   * Hydrates like hydrateFromFirestore and records the sync in the same update, so
   * a saved `logSync` always describes the foodLog saved next to it.
   */
  applyLogSync: (
    uid: string,
    logs: Record<string, DailyFoodLog>,
    newestUpdatedAtMs: number | null,
    wasFullSync: boolean
  ) => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useFoodLogStore = create<FoodLogState>()(
  persist(
    (set, get) => {
      // Create the debounce writer inside the store closure so writeTimers
      // is scoped here and not leaked across sign-out/sign-in cycles (#26)
      const { scheduleFirestoreWrite, hasPendingWrite, forgetPendingWrites } =
        createFirestoreWriter();

      /** Incoming days win over the local copy, except a day with a write on its way. */
      function mergeFromFirestore(
        local: Record<string, DailyFoodLog>,
        incoming: Record<string, DailyFoodLog>
      ): Record<string, DailyFoodLog> {
        const merged = { ...local };
        for (const [date, log] of Object.entries(incoming)) {
          if (!hasPendingWrite(date)) merged[date] = log;
        }
        return merged;
      }

      return {
      foodLog: {},
      logSync: null,

      // ── Add Entry ──────────────────────────────────────────────────────────
      addFoodEntry: (date, mealSlot, item, locationName, servings = 1) => {
        const validServings = Math.max(0.25, servings);

        const entry: LoggedFoodEntry = {
          id:           uuidv4(),
          menuItemId:   item.id,
          menuItemName: item.name,
          locationName,
          mealSlot,
          servings:     validServings,
          calories:     Math.round(item.calories * validServings),
          protein:      Number((item.protein * validServings).toFixed(1)),
          totalFat:     Number((item.totalFat * validServings).toFixed(1)),
          totalCarbs:   Number((item.totalCarbs * validServings).toFixed(1)),
          sodium:       Math.round(item.sodium * validServings),
          fiber:        Number((item.fiber * validServings).toFixed(1)),
          loggedAt:     new Date().toISOString(),
        };

        set((state) => {
          const log           = ensureDayExists(state.foodLog, date);
          const day           = log[date]!;
          const updatedEntries = [...day.entries, entry];
          const updatedDay    = { ...day, entries: updatedEntries, totals: computeTotals(updatedEntries) };
          scheduleFirestoreWrite(date, updatedDay);
          return { foodLog: { ...log, [date]: updatedDay } };
        });
      },

      // ── Remove Entry ───────────────────────────────────────────────────────
      removeFoodEntry: (date, entryId) => {
        set((state) => {
          const day = state.foodLog[date];
          if (!day) return state;

          const updatedEntries = day.entries.filter((e) => e.id !== entryId);
          const updatedDay     = { ...day, entries: updatedEntries, totals: computeTotals(updatedEntries) };
          scheduleFirestoreWrite(date, updatedDay);
          return { foodLog: { ...state.foodLog, [date]: updatedDay } };
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
            const ratio = validServings / entry.servings;
            return {
              ...entry,
              servings:   validServings,
              calories:   Math.round(entry.calories * ratio),
              protein:    Number((entry.protein * ratio).toFixed(1)),
              totalFat:   Number((entry.totalFat * ratio).toFixed(1)),
              totalCarbs: Number((entry.totalCarbs * ratio).toFixed(1)),
              sodium:     Math.round(entry.sodium * ratio),
              fiber:      Number((entry.fiber * ratio).toFixed(1)),
            };
          });

          const updatedDay = { ...day, entries: updatedEntries, totals: computeTotals(updatedEntries) };
          scheduleFirestoreWrite(date, updatedDay);
          return { foodLog: { ...state.foodLog, [date]: updatedDay } };
        });
      },

      // ── Getters (#6) ───────────────────────────────────────────────────────
      // Use EMPTY_ENTRIES constant so that a missing date returns a stable
      // reference instead of a new [] on every call (preserves memoization).
      getDailyTotals:    (date)           => get().foodLog[date]?.totals ?? emptyTotals(),
      getDailyEntries:   (date)           => get().foodLog[date]?.entries ?? EMPTY_ENTRIES,
      getEntriesForMeal: (date, mealSlot) =>
        get().foodLog[date]?.entries.filter((e) => e.mealSlot === mealSlot) ?? EMPTY_ENTRIES,

      // ── Clear Day ──────────────────────────────────────────────────────────
      clearDayLog: (date) => {
        const emptyDay = { date, entries: [], totals: emptyTotals() };
        set((state) => ({ foodLog: { ...state.foodLog, [date]: emptyDay } }));
        scheduleFirestoreWrite(date, emptyDay);
      },

      // ── Prune Old Logs ─────────────────────────────────────────────────────
      pruneOldLogs: () => {
        set((state) => ({ foodLog: pruneOldEntries(state.foodLog) }));
      },

      // ── Hydrate from Firestore ─────────────────────────────────────────────
      hydrateFromFirestore: (logs) => {
        set((state) => ({
          // Merge incoming logs, giving Firestore priority over local cache
          foodLog: mergeFromFirestore(state.foodLog, logs),
        }));
      },

      // ── Account Ownership ──────────────────────────────────────────────────
      claimLogCache: (uid) => {
        const { logSync } = get();
        if (logSync && logSync.uid !== uid) {
          forgetPendingWrites();
          set({ foodLog: {}, logSync: null });
        }
      },

      // ── Record a Sync ──────────────────────────────────────────────────────
      applyLogSync: (uid, logs, newestUpdatedAtMs, wasFullSync) => {
        set((state) => {
          const previous = state.logSync?.uid === uid ? state.logSync : null;
          return {
            foodLog: mergeFromFirestore(state.foodLog, logs),
            logSync: {
              uid,
              cursorMs: Math.max(previous?.cursorMs ?? 0, newestUpdatedAtMs ?? 0) || null,
              lastFullSyncAt:
                wasFullSync || !previous ? Date.now() : previous.lastFullSyncAt,
            },
          };
        });
      },
    };},

    {
      name:    "higgins-food-log",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ foodLog: state.foodLog, logSync: state.logSync }),
    }
  )
);
