/**
 * @file src/hooks/useMealReminderSwitch.ts
 * @description Turns the 8am, noon and 8pm meal reminders on and off. Used by
 * the Notifications section on Profile and by the last step of the intro tour.
 *
 * `enabled` is the account-wide setting on the profile; `permission` is whether
 * this browser lets the app show notifications. They're separate: reminders can
 * be on for the account while this device hasn't been allowed yet.
 *
 * The permission is kept in a small shared store, so asking from the tour also
 * updates the Profile page sitting under it.
 */
import { useEffect, useState } from "react";
import { create } from "zustand";
import { useUserStore } from "@/stores";
import { useAuth } from "@/firebase/AuthProvider";
import { getServiceWorker, isPushSupported, subscribeThisDevice, turnOffPush } from "@/firebase/pushNotifications";

export type ReminderPermission = NotificationPermission | "unsupported";

/** What happened when the user flipped the switch. */
export type ReminderResult = "ok" | "denied" | "failed";

function readPermission(): ReminderPermission {
  if (typeof window === "undefined" || !isPushSupported()) return "unsupported";
  return Notification.permission;
}

const usePermissionStore = create<{ value: ReminderPermission }>(() => ({ value: readPermission() }));

/** Asks the browser. Must be called straight from a tap, before any await. */
async function requestPermission(): Promise<NotificationPermission> {
  const perm = await Notification.requestPermission();
  usePermissionStore.setState({ value: perm });
  return perm;
}

/**
 * Confirms with a real notification, through the service worker (new
 * Notification() throws on Android Chrome and iOS Safari). Not awaited: it's
 * only feedback, and the switch already shows reminders are on.
 */
function showRemindersOnNotification() {
  getServiceWorker()
    .then((reg) =>
      reg.showNotification("Higgins Helper 🥗", {
        body: "Meal reminders are on! You'll get a reminder to log food at 8am, noon, and 8pm.",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: "reminder-test",
        data: { url: "/log" },
      })
    )
    .catch(() => {});
}

/** Saves the account-wide setting (persisted to Firestore by the store). */
function saveEnabled(enabled: boolean) {
  const { userProfile, setUserProfile } = useUserStore.getState();
  if (userProfile) setUserProfile({ ...userProfile, mealReminders: { enabled } });
}

export function useMealReminderSwitch() {
  const { user } = useAuth();
  const enabled    = useUserStore((s) => s.userProfile?.mealReminders?.enabled ?? false);
  const permission = usePermissionStore((s) => s.value);
  const [busy, setBusy] = useState(false);

  // Pick up a change made in the browser's settings since the app opened
  useEffect(() => {
    usePermissionStore.setState({ value: readPermission() });
  }, []);

  async function run(action: () => Promise<ReminderResult>): Promise<ReminderResult> {
    setBusy(true);
    try {
      return await action();
    } catch (err) {
      console.error("[reminders] Could not change meal reminders:", err);
      return "failed";
    } finally {
      setBusy(false);
    }
  }

  /** Asks for permission if needed, subscribes this device and saves the setting. */
  const turnOn = () => run(async () => {
    const perm = permission === "granted" ? "granted" : await requestPermission();
    if (perm !== "granted") return "denied";
    // No user in local test mode, where there's nothing to push from
    if (user) await subscribeThisDevice(user.uid);
    saveEnabled(true);
    showRemindersOnNotification();
    return "ok";
  });

  /** Stops every device, without revoking the browser's permission. */
  const turnOff = () => run(async () => {
    if (user) await turnOffPush(user.uid);
    saveEnabled(false);
    return "ok";
  });

  /** Reminders are on for the account, but this device hasn't allowed notifications. */
  const allowOnThisDevice = () => run(async () => {
    if ((await requestPermission()) !== "granted") return "denied";
    if (user) await subscribeThisDevice(user.uid);
    showRemindersOnNotification();
    return "ok";
  });

  return { enabled, permission, busy, turnOn, turnOff, allowOnThisDevice };
}
