/**
 * @file src/stores/useWaterStore.ts
 * @description Zustand slice for daily water intake tracking.
 * Stores cups logged per day. Goal is 8 cups (2L) by default,
 * adjustable via user preference (future). Persisted to localStorage.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WaterState {
  /** Record of date → cups logged (each log entry is 1 cup = ~240ml) */
  waterLog: Record<string, number>;

  /** Daily target in cups */
  dailyGoalCups: number;

  /** Add an arbitrary number of cups to a given date */
  addWater: (date: string, amount: number) => void;

  /** Remove one cup from a given date */
  removeCup: (date: string) => void;

  /** Get cups logged for a given date */
  getCups: (date: string) => number;

  /** Set the daily goal */
  setDailyGoal: (cups: number) => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      waterLog: {},
      dailyGoalCups: 8,

      addWater: (date, amount) =>
        set((s) => ({ waterLog: { ...s.waterLog, [date]: (s.waterLog[date] ?? 0) + amount } })),

      removeCup: (date) =>
        set((s) => ({
          waterLog: {
            ...s.waterLog,
            [date]: Math.max(0, (s.waterLog[date] ?? 0) - 1),
          },
        })),

      getCups: (date) => get().waterLog[date] ?? 0,

      setDailyGoal: (cups) => set({ dailyGoalCups: cups }),
    }),
    {
      name: "higgins-water-log",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
