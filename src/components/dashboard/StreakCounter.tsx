/**
 * @file src/components/dashboard/StreakCounter.tsx
 * @description Shows the user's consecutive day logging streak.
 * A day "counts" if the user logged at least one food entry.
 */
import type { DailyFoodLog } from "@/types";

interface Props {
  foodLog: Record<string, DailyFoodLog>;
}

function computeStreak(foodLog: Record<string, DailyFoodLog>): number {
  const today = new Date();
  let streak = 0;

  // Walk backwards from today
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = foodLog[key];

    if (log && log.entries.length > 0) {
      streak++;
    } else if (i > 0) {
      // Today being empty is OK (day not over), but a gap yesterday breaks the streak
      break;
    }
  }
  return streak;
}

export default function StreakCounter({ foodLog }: Props) {
  const streak = computeStreak(foodLog);
  if (streak === 0) return null;

  return (
    <div className="glass-2" style={{
      padding: "0.75rem 1rem",
      display: "flex", alignItems: "center", gap: "0.75rem",
    }}>
      <div style={{
        fontSize: "1.75rem", lineHeight: 1,
        filter: streak >= 7 ? "drop-shadow(0 0 6px #f59e0b)" : "none",
      }}>
        🔥
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-text-1)" }}>
          {streak}-day streak
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-3)", marginTop: 1 }}>
          {streak >= 7
            ? "Incredible consistency! Keep it up 💪"
            : streak >= 3
            ? "You're on a roll — don't break the chain!"
            : "Log again tomorrow to extend your streak"}
        </div>
      </div>
    </div>
  );
}
