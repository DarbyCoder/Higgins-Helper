/**
 * @file scripts/seedEmulator.ts
 * @description Seeds the local Firebase Emulator Suite with one test account and
 * a realistic starting dataset, so every sandbox run boots into the same known
 * state. Run with `npm run seed` while `npm run emulators` is up (dev:sandbox
 * does both for you).
 *
 * The emulators start empty on every launch — this script is what makes the
 * sandbox reproducible rather than blank.
 *
 * It talks to the emulators over their REST APIs with plain fetch: no
 * firebase-admin dependency, no service-account credentials, and no possible
 * path to the production project. The Firestore writes use the emulator's
 * "Bearer owner" token, which bypasses firestore.rules the way the Admin SDK
 * would — rules still apply to the app itself in the browser.
 *
 * Data written:
 *   auth user                     — VITE_DEV_AUTH_EMAIL / VITE_DEV_AUTH_PASSWORD
 *   users/{uid}/profile/data      — profile + macro targets
 *   users/{uid}/foodLogs/{date}   — today and the two prior days
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

// ─── Emulator endpoints ───────────────────────────────────────────────────────
// Must match firebase.json and src/firebase/firebaseConfig.ts.

const PROJECT_ID    = "demo-higgins-helper";
const HOST          = "127.0.0.1";
const AUTH_URL      = `http://${HOST}:9099`;
const FIRESTORE_URL = `http://${HOST}:8080`;
const DOCS_URL      = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const TEST_EMAIL    = process.env.VITE_DEV_AUTH_EMAIL    ?? "dev@higgins.local";
const TEST_PASSWORD = process.env.VITE_DEV_AUTH_PASSWORD ?? "devpassword";
const TEST_NAME     = "Dev Tester";

// ─── Firestore REST value encoding ────────────────────────────────────────────
// The REST API wants every value tagged with its type, unlike the SDKs.

type FirestoreValue = Record<string, unknown>;

function toValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date)      return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "string")  return { stringValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFields(value as Record<string, unknown>) } };
  }
  throw new Error(`Cannot encode value of type ${typeof value} for Firestore`);
}

function toFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    fields[key] = toValue(value);
  }
  return fields;
}

// ─── Emulator helpers ─────────────────────────────────────────────────────────

/** Polls both emulators until they answer, so `npm run seed` can start immediately. */
async function waitForEmulators(timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const targets: Array<[string, string]> = [
    ["Auth", AUTH_URL],
    ["Firestore", FIRESTORE_URL],
  ];

  for (const [name, url] of targets) {
    for (;;) {
      try {
        await fetch(url);
        break;
      } catch {
        if (Date.now() > deadline) {
          throw new Error(
            `${name} emulator never came up at ${url}. Start it with: npm run emulators`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
}

/**
 * Creates the test account, or reuses it if one already exists (which happens
 * when the emulators were started with previously exported data).
 * Returns the uid.
 */
async function ensureTestUser(): Promise<string> {
  const signUp = await fetch(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:             TEST_EMAIL,
        password:          TEST_PASSWORD,
        displayName:       TEST_NAME,
        returnSecureToken: true,
      }),
    },
  );

  if (signUp.ok) {
    const { localId } = (await signUp.json()) as { localId: string };
    console.log(`  auth user created   ${TEST_EMAIL} (uid ${localId})`);
    return localId;
  }

  const failure = (await signUp.json()) as { error?: { message?: string } };
  if (failure.error?.message !== "EMAIL_EXISTS") {
    throw new Error(
      `Auth emulator rejected signUp: ${failure.error?.message ?? signUp.status}`,
    );
  }

  const signIn = await fetch(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:             TEST_EMAIL,
        password:          TEST_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  if (!signIn.ok) {
    throw new Error(
      `${TEST_EMAIL} already exists in the emulator, but the password in .env.local does not match it.`,
    );
  }
  const { localId } = (await signIn.json()) as { localId: string };
  console.log(`  auth user reused    ${TEST_EMAIL} (uid ${localId})`);
  return localId;
}

/** Writes (creating or overwriting) a single document at a "users/uid/..." path. */
async function writeDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${DOCS_URL}/${path}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body:    JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    throw new Error(`Firestore write to ${path} failed (${res.status}): ${await res.text()}`);
  }
  console.log(`  doc written         ${path}`);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

/** Local-calendar date string, matching toLocalDateString in useDateStore. */
function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

const TEST_PROFILE = {
  profile: {
    name:                TEST_NAME,
    weight:              170,
    weightUnit:          "lbs",
    height:              70,
    heightUnit:          "in",
    age:                 20,
    sex:                 "male",
    activityLevel:       "moderate",
    goal:                "maintain",
    dietaryRestrictions: [] as string[],
    wantsAIAdvisor:      true,
    mealReminders: {
      enabled:       false,
      breakfastTime: "08:30",
      lunchTime:     "12:30",
      dinnerTime:    "18:30",
    },
  },
  macroTargets: {
    calories:   2650,
    protein:    136,
    totalFat:   82,
    totalCarbs: 328,
    fiber:      28,
    sodium:     2300,
  },
  macroTargetsManuallySet: false,
  theme:                   "dark",
};

/** One logged item, already pre-multiplied by servings the way the app stores it. */
interface SeedEntry {
  name:     string;
  slot:     "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein:  number;
  fat:      number;
  carbs:    number;
  sodium:   number;
  fiber:    number;
}

const SEED_DAYS: Array<{ offset: number; entries: SeedEntry[] }> = [
  {
    offset: 0,
    entries: [
      { name: "Scrambled Eggs",         slot: "breakfast", calories: 220, protein: 18, fat: 15, carbs: 2,  sodium: 380, fiber: 0 },
      { name: "Grilled Chicken Breast", slot: "lunch",     calories: 310, protein: 42, fat: 12, carbs: 3,  sodium: 520, fiber: 0 },
      { name: "Brown Rice",             slot: "lunch",     calories: 215, protein: 5,  fat: 2,  carbs: 45, sodium: 10,  fiber: 4 },
    ],
  },
  {
    offset: -1,
    entries: [
      { name: "Oatmeal with Berries",   slot: "breakfast", calories: 290, protein: 9,  fat: 6,  carbs: 52, sodium: 115, fiber: 8 },
      { name: "Turkey Sandwich",        slot: "lunch",     calories: 430, protein: 28, fat: 14, carbs: 46, sodium: 980, fiber: 4 },
      { name: "Baked Salmon",           slot: "dinner",    calories: 380, protein: 40, fat: 22, carbs: 0,  sodium: 290, fiber: 0 },
    ],
  },
  {
    offset: -2,
    entries: [
      { name: "Greek Yogurt Parfait",   slot: "breakfast", calories: 245, protein: 17, fat: 6,  carbs: 32, sodium: 95,  fiber: 3 },
      { name: "Veggie Stir Fry",        slot: "dinner",    calories: 395, protein: 14, fat: 13, carbs: 58, sodium: 740, fiber: 9 },
    ],
  },
];

function buildFoodLog(date: string, entries: SeedEntry[]) {
  const logged = entries.map((entry, i) => ({
    id:           crypto.randomUUID(),
    menuItemId:   `seed-${date}-${i}`,
    menuItemName: entry.name,
    locationName: "The Table at Higgins",
    mealSlot:     entry.slot,
    servings:     1,
    calories:     entry.calories,
    protein:      entry.protein,
    totalFat:     entry.fat,
    totalCarbs:   entry.carbs,
    sodium:       entry.sodium,
    fiber:        entry.fiber,
    loggedAt:     new Date(`${date}T12:00:00`).toISOString(),
  }));

  type MacroKey = "calories" | "protein" | "totalFat" | "totalCarbs" | "sodium" | "fiber";
  const sum = (key: MacroKey) => logged.reduce((total, entry) => total + entry[key], 0);

  return {
    date,
    entries: logged,
    totals: {
      calories:   sum("calories"),
      protein:    sum("protein"),
      totalFat:   sum("totalFat"),
      totalCarbs: sum("totalCarbs"),
      sodium:     sum("sodium"),
      fiber:      sum("fiber"),
    },
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding emulators for project "${PROJECT_ID}"...`);
  await waitForEmulators();

  const uid = await ensureTestUser();

  await writeDoc(`users/${uid}/profile/data`, { ...TEST_PROFILE, updatedAt: new Date() });

  for (const day of SEED_DAYS) {
    const date = localDate(day.offset);
    await writeDoc(`users/${uid}/foodLogs/${date}`, buildFoodLog(date, day.entries));
  }

  console.log(
    `\nDone. Sign-in is automatic in sandbox mode (${TEST_EMAIL}).` +
      "\nInspect or edit the data at http://127.0.0.1:4000\n",
  );
}

main().catch((err) => {
  console.error(`\nSeed failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
