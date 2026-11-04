/**
 * @file src/hooks/useMealReminders.ts
 * @description Keeps meal reminders working on this device while the app runs.
 *
 * The 8am, noon and 8pm notifications themselves are pushed from
 * scripts/meal-reminders/send.mjs, so they arrive with the app closed. This hook,
 * which runs inside RootLayout, does two things when reminders are on:
 *
 * 1. PUSH SUBSCRIPTION:
 *    Brings this device's subscription in line with the account's setting, so it
 *    follows a change made on another device. See pushNotifications.ts.
 *
 * 2. IN-APP UNLOGGED-MEAL CHECKS (Fix #22):
 *    On mount (and whenever the food log changes), checks whether the user
 *    has logged anything for each meal slot by a "deadline" time. If not,
 *    shows a gentle in-app toast reminder.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import { useFoodLogStore } from "@/stores/useFoodLogStore";
import { useUIStore } from "@/stores/useUIStore";
import { toLocalDateString } from "@/stores/useDateStore";
import { syncPushSubscription } from "@/firebase/pushNotifications";
import type { MealSlot } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealSchedule {
  slot: MealSlot;
  label: string;
  /** Hour (0-23) after which we consider the meal overdue for in-app check */
  deadlineHour: number;
}

const MEAL_SCHEDULES: MealSchedule[] = [
  { slot: "breakfast", label: "Breakfast", deadlineHour: 10 },
  { slot: "lunch",     label: "Lunch",     deadlineHour: 14 },
  { slot: "dinner",    label: "Dinner",    deadlineHour: 20 },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMealReminders() {
  const uid            = useAuthStore((s) => s.user?.uid);
  const userProfile    = useUserStore((s) => s.userProfile);
  const profileStatus  = useUserStore((s) => s.profileStatus);
  const showToast      = useUIStore((s) => s.showToast);
  // Fix: use 'foodLog' (correct property name) not 'logs'
  const todayLog       = useFoodLogStore((s) => s.foodLog[toLocalDateString()]);

  const remindersOn = userProfile?.mealReminders?.enabled ?? false;

  // ── Push subscription ─────────────────────────────────────────────────────
  // Waits for "ready" so it acts on the account's setting from Firestore, not on
  // a cached profile that may be out of date.
  useEffect(() => {
    if (!uid || profileStatus !== "ready") return;
    syncPushSubscription(uid, remindersOn).catch((err) => {
      console.warn("[useMealReminders] Could not sync push subscription:", err);
    });
  }, [uid, profileStatus, remindersOn]);

  // ── Fix #22: In-app check for unlogged meal slots ─────────────────────────
  // Runs on mount and whenever today's food log changes.
  useEffect(() => {
    if (!remindersOn) return;

    const now = new Date();
    const currentHour = now.getHours();

    const loggedSlots = new Set(
      (todayLog?.entries ?? []).map((e) => e.mealSlot)
    );

    MEAL_SCHEDULES.forEach(({ slot, label, deadlineHour }) => {
      // Only nudge if current time is past the deadline and slot not yet logged
      if (currentHour >= deadlineHour && !loggedSlots.has(slot)) {
        showToast(`Don't forget to log your ${label.toLowerCase()}!`, "info");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLog]);
}
