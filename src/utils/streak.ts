/**
 * @file src/utils/streak.ts
 * @description The logging streak: how many days in a row, up to today, have
 * at least one food entry. Shown as the flame badge in the header.
 */
import type { DailyFoodLog } from "@/types";
import { toLocalDateString } from "@/stores/useDateStore";

export function computeStreak(foodLog: Record<string, DailyFoodLog>): number {
  const today = new Date();
  let streak = 0;

  // Walk backwards from today
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Log days are keyed by local date. A UTC key is already tomorrow by evening in the US.
    const log = foodLog[toLocalDateString(d)];

    if (log && log.entries.length > 0) {
      streak++;
    } else if (i > 0) {
      // Today being empty is OK (day not over), but a gap yesterday breaks the streak
      break;
    }
  }
  return streak;
}
