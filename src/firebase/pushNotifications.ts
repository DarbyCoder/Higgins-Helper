/**
 * @file src/firebase/pushNotifications.ts
 * @description Registers this device for the 8am, noon and 8pm meal reminders.
 *
 * A device subscribes with the browser's push service, then stores that subscription
 * at users/{uid}/pushSubscriptions/{id}. scripts/meal-reminders/send.mjs reads those
 * docs on a schedule and sends through the push service, and public/sw-handlers.js
 * shows the notification. So reminders arrive with the app closed.
 *
 * `mealReminders.enabled` on the profile is the account-wide setting. Each device
 * then has its own subscription, kept in step by syncPushSubscription on app open.
 */

import {
  savePushSubscription,
  deletePushSubscription,
  deleteAllPushSubscriptions,
} from "./firestoreService";

/** Static property access: see the note in firebaseConfig.ts. Not a secret. */
const VAPID_PUBLIC_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Remembers what this device last stored, so an open doesn't have to write. */
const SAVED_KEY = "higgins-push-saved";

/** Stored again after this long, in case the doc was removed but the browser's is fine. */
const RESAVE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const SERVICE_WORKER_WAIT_MS = 10_000;
const SIGN_OUT_WAIT_MS = 3_000;

interface SavedSubscription {
  uid: string;
  id: string;
  savedAt: number;
}

function readSaved(): SavedSubscription | null {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
  } catch {
    return null;
  }
}

/** False on an iPhone until the app is installed to the home screen. */
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** serviceWorker.ready never settles if no worker registers, as in dev. */
export async function getServiceWorker(): Promise<ServiceWorkerRegistration> {
  const timedOut = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("No service worker available")), SERVICE_WORKER_WAIT_MS);
  });
  return Promise.race([navigator.serviceWorker.ready, timedOut]);
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Doc id for a subscription. Endpoints are long URLs and contain slashes. */
async function subscriptionId(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Subscribes this device for `uid` and stores the subscription, writing only if
 * something changed. Needs notification permission. Throws if it can't finish.
 */
export async function subscribeThisDevice(uid: string): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new Error("VITE_VAPID_PUBLIC_KEY is not set");

  const worker = await getServiceWorker();
  const saved = readSaved();

  let subscription = await worker.pushManager.getSubscription();
  if (subscription && saved && saved.uid !== uid) {
    // Left behind by another account (sign-out couldn't reach Firestore). A new
    // endpoint stops that account's doc from reaching this device.
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
  });

  const id = await subscriptionId(subscription.endpoint);
  const upToDate =
    saved?.uid === uid && saved.id === id && Date.now() - saved.savedAt < RESAVE_AFTER_MS;
  if (upToDate) return;

  await savePushSubscription(uid, id, subscription.toJSON());
  localStorage.setItem(SAVED_KEY, JSON.stringify({ uid, id, savedAt: Date.now() }));
}

async function unsubscribeThisDevice(): Promise<void> {
  const worker = await getServiceWorker();
  const subscription = await worker.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  localStorage.removeItem(SAVED_KEY);
}

/**
 * Brings this device in line with the account-wide setting. Called on app open, so a
 * device follows a change made on another one. Can't ask for permission without a
 * tap, so a device that hasn't granted it is left for Profile to offer.
 */
export async function syncPushSubscription(uid: string, enabled: boolean): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  if (enabled) {
    await subscribeThisDevice(uid);
  } else if (readSaved()) {
    await unsubscribeThisDevice();
  }
}

/** Stops reminders on all of this account's devices, not just this one. */
export async function turnOffPush(uid: string): Promise<void> {
  await deleteAllPushSubscriptions(uid);
  if (isPushSupported()) await unsubscribeThisDevice();
}

/**
 * Takes this device off the account's reminders. Must run before signing out, since
 * the doc can't be deleted afterwards. Gives up quickly so being offline can't hold
 * up signing out, and subscribeThisDevice cleans up if it didn't finish.
 */
export async function removeThisDeviceFromPush(uid: string): Promise<void> {
  const saved = readSaved();
  if (!isPushSupported() || saved?.uid !== uid) return;

  const removal = (async () => {
    await deletePushSubscription(uid, saved.id);
    await unsubscribeThisDevice();
  })();
  await Promise.race([
    removal.catch((err) => console.warn("[push] Could not remove this device:", err)),
    new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS)),
  ]);
}
