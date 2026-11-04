/**
 * @file scripts/meal-reminders/send.mjs
 * @description Sends the "time to log" push notification to every subscribed device.
 *
 * Run by .github/workflows/meal-reminders.yml. It lives in GitHub Actions rather
 * than on the Express server because Render's free plan sleeps when idle, so a
 * timer there wouldn't fire, and this way there's no public endpoint to protect.
 *
 * Devices register themselves at users/{uid}/pushSubscriptions/{id}, written by
 * src/firebase/pushNotifications.ts and received by public/sw-handlers.js.
 *
 * Costs one Firestore read per subscribed device per send, so 3 a day per device.
 * Runs that aren't due stop before touching Firestore.
 *
 * Logs counts only: on a public repo, the run logs are public too.
 *
 * Required env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT (JSON)
 * Optional env: TEST_UID sends right now to that account's devices only, TEST_MEAL
 *               picks the wording.
 */

import { pathToFileURL } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";

const TIME_ZONE = "America/New_York";
const SITE_URL = "https://higgins-helper.onrender.com";

const SLOTS = [
  { minuteOfDay: 8 * 60,  meal: "breakfast" },
  { minuteOfDay: 12 * 60, meal: "lunch" },
  { minuteOfDay: 20 * 60, meal: "dinner" },
];

// A run counts for a slot from this long before it (it then waits for the exact
// time) until this long after. GitHub can start scheduled runs late; past this a
// reminder is dropped, because "time to log breakfast" at 2pm isn't useful.
const EARLY_MINUTES = 10;
const LATE_MINUTES = 50;

// Phones offline longer than this don't get the reminder when they reconnect.
const PUSH_TTL_SECONDS = 30 * 60;

// Users write their own subscription docs, so `endpoint` isn't trusted. Only the
// browser push services are ever contacted, never an address someone typed in.
const PUSH_SERVICE_HOST =
  /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)$/;

const SEND_BATCH_SIZE = 50;

/** Minutes since midnight in the app's time zone, daylight saving included. */
export function minuteOfDayInTimeZone(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type) => Number(parts.find((p) => p.type === type).value);
  return part("hour") * 60 + part("minute") + part("second") / 60;
}

/** The slot this run is for, and how long to wait for its exact time. Null if none. */
export function findDueSlot(now = new Date()) {
  const minute = minuteOfDayInTimeZone(now);
  for (const { minuteOfDay, meal } of SLOTS) {
    const offset = minute - minuteOfDay;
    if (offset >= -EARLY_MINUTES && offset < LATE_MINUTES) {
      return { meal, waitMs: Math.max(0, Math.round(-offset * 60_000)) };
    }
  }
  return null;
}

/** The fields public/sw-handlers.js reads from a push. */
export function buildPayload(meal) {
  return JSON.stringify({
    title: `🥗 Time to log ${meal}!`,
    body: `Don't forget to log your ${meal} in Higgins Helper.`,
    url: "/log",
  });
}

export function isAllowedEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_SERVICE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Sends to each subscription doc. A subscription the push service says is gone
 * (404 or 410: uninstalled, permission revoked) has its doc deleted.
 */
export async function sendReminders(docs, payload, send = webpush.sendNotification) {
  const counts = { sent: 0, expired: 0, failed: 0, skipped: 0 };

  async function sendOne(doc) {
    const { subscription } = doc.data();
    if (!isAllowedEndpoint(subscription?.endpoint)) {
      counts.skipped++;
      return;
    }
    try {
      await send(subscription, payload, { TTL: PUSH_TTL_SECONDS, urgency: "high" });
      counts.sent++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        counts.expired++;
        await doc.ref.delete();
      } else {
        counts.failed++;
        console.error(`Push failed with status ${err?.statusCode ?? "unknown"}`);
      }
    }
  }

  for (let i = 0; i < docs.length; i += SEND_BATCH_SIZE) {
    await Promise.all(docs.slice(i, i + SEND_BATCH_SIZE).map(sendOne));
  }
  return counts;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main() {
  const testUid = process.env.TEST_UID?.trim();
  const due = testUid
    ? { meal: process.env.TEST_MEAL || "lunch", waitMs: 0 }
    : findDueSlot();

  if (!due) {
    console.log("Not a reminder time. Nothing to send.");
    return;
  }

  webpush.setVapidDetails(SITE_URL, requireEnv("VAPID_PUBLIC_KEY"), requireEnv("VAPID_PRIVATE_KEY"));
  const db = getFirestore(
    initializeApp({ credential: cert(JSON.parse(requireEnv("FIREBASE_SERVICE_ACCOUNT"))) }),
  );

  if (due.waitMs > 0) {
    console.log(`Waiting ${Math.round(due.waitMs / 1000)}s for the ${due.meal} reminder time.`);
    await new Promise((resolve) => setTimeout(resolve, due.waitMs));
  }

  const snap = await (testUid
    ? db.collection(`users/${testUid}/pushSubscriptions`)
    : db.collectionGroup("pushSubscriptions")
  ).get();

  if (testUid && snap.empty) {
    throw new Error("That account has no subscribed devices. Turn reminders on in Profile first.");
  }

  const counts = await sendReminders(snap.docs, buildPayload(due.meal));
  console.log(`${due.meal}: ${snap.size} device(s). ${JSON.stringify(counts)}`);

  // A red run makes GitHub email the repo owner. Skipped and expired are normal.
  if (counts.failed > 0 && counts.sent === 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
