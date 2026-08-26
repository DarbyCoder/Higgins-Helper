/**
 * @file src/hooks/useMealReminders.ts
 * @description Fix #17 & #22: Meal reminder scheduling engine.
 *
 * This hook runs inside RootLayout and does two things:
 *
 * 1. SCHEDULED REMINDERS (Fix #17):
 *    Computes the milliseconds until each configured meal time and sets a
 *    setTimeout for each. When it fires, it either shows an in-app toast
 *    (always available) or a Service Worker push notification (if the user
 *    is in a PWA context and permission is granted).
 *
 * 2. IN-APP UNLOGGED-MEAL CHECKS (Fix #22):
 *    On mount (and whenever the food log changes), checks whether the user
 *    has logged anything for each meal slot by a "deadline" time. If not,
 *    shows a gentle in-app toast reminder.
 *
 * All timers are cleared on unmount to prevent memory leaks.
 */

import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/useUserStore";
import { useFoodLogStore } from "@/stores/useFoodLogStore";
import { useUIStore } from "@/stores/useUIStore";
import type { MealSlot } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealSchedule {
  slot: MealSlot;
  timeKey: "breakfastTime" | "lunchTime" | "dinnerTime";
  label: string;
  /** Hour (0-23) after which we consider the meal overdue for in-app check */
  deadlineHour: number;
}

const MEAL_SCHEDULES: MealSchedule[] = [
  { slot: "breakfast", timeKey: "breakfastTime", label: "Breakfast", deadlineHour: 10 },
  { slot: "lunch",     timeKey: "lunchTime",     label: "Lunch",     deadlineHour: 14 },
  { slot: "dinner",    timeKey: "dinnerTime",     label: "Dinner",    deadlineHour: 20 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a "HH:MM" time string, returns the number of milliseconds until
 * that time today (ET). If the time has already passed today, returns the
 * milliseconds until that time tomorrow.
 */
function msUntilTime(timeStr: string): number {
  const now = new Date();
  const [hours, minutes] = timeStr.split(":").map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes ?? 0, 0, 0);

  let diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    // Already passed today — schedule for tomorrow
    diff += 24 * 60 * 60 * 1000;
  }
  return diff;
}

/**
 * Shows a reminder notification. Prefers SW push notification (works in PWA
 * on mobile) over the legacy Notification constructor (Fix #19 pattern).
 * Falls back to in-app toast if notifications aren't available or permitted.
 */
async function showMealReminder(
  label: string,
  showToast: (msg: string, type?: "success" | "error" | "info") => void
) {
  const title = `🥗 Time to log ${label}!`;
  const body = `Don't forget to log your ${label.toLowerCase()} in Higgins Helper.`;

  // Try Service Worker notification first (PWA-safe, mobile-safe)
  if (
    "serviceWorker" in navigator &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "/logo-square.jpg",
        badge: "/logo-square.jpg",
        // Cast to any to allow non-standard but widely supported fields
        // (renotify, data) that the TS lib doesn't model in NotificationOptions
        tag: `meal-reminder-${label.toLowerCase()}`,
        data: { url: "/log" },
      } as NotificationOptions);
      return; // SW notification succeeded — no toast needed
    } catch {
      // SW notification failed (e.g. iOS restrictions) — fall through to toast
    }
  }

  // Fallback: in-app toast
  showToast(`${title} ${body}`, "info");
}


// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMealReminders() {
  const userProfile    = useUserStore((s) => s.userProfile);
  const showToast      = useUIStore((s) => s.showToast);
  // Fix: use 'foodLog' (correct property name) not 'logs'
  const todayLog       = useFoodLogStore((s) => {
    const today = new Date().toISOString().slice(0, 10);
    return s.foodLog[today];
  });

  // Track scheduled timeout IDs so we can clear them on unmount/re-schedule
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Fix #17: Scheduled reminder timers ────────────────────────────────────
  useEffect(() => {
    const prefs = userProfile?.mealReminders;
    if (!prefs?.enabled) return;

    // Clear any existing timers before scheduling new ones
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];

    MEAL_SCHEDULES.forEach(({ timeKey, label }) => {
      const timeStr = prefs[timeKey];
      if (!timeStr) return;

      const delay = msUntilTime(timeStr);
      const id = setTimeout(() => {
        showMealReminder(label, showToast);
      }, delay);

      timerIds.current.push(id);
    });

    return () => {
      timerIds.current.forEach(clearTimeout);
      timerIds.current = [];
    };
  }, [userProfile?.mealReminders, showToast]);

  // ── Fix #22: In-app check for unlogged meal slots ─────────────────────────
  // Runs on mount and whenever today's food log changes.
  useEffect(() => {
    const prefs = userProfile?.mealReminders;
    if (!prefs?.enabled) return;

    const now = new Date();
    const currentHour = now.getHours();

    const loggedSlots = new Set(
      (todayLog?.entries ?? []).map((e) => e.mealSlot)
    );

    MEAL_SCHEDULES.forEach(({ slot, label, deadlineHour }) => {
      // Only nudge if current time is past the deadline and slot not yet logged
      if (currentHour >= deadlineHour && !loggedSlots.has(slot)) {
        showToast(`Don't forget to log your ${label.toLowerCase()}! 🥗`, "info");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLog]);
}
