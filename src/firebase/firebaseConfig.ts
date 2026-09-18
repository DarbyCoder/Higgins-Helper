/**
 * @file src/firebase/firebaseConfig.ts
 * @description Firebase app initialization. Exports the Auth and Firestore
 * instances used throughout the app. All config values come from Vite
 * environment variables (VITE_FIREBASE_*) so no secrets are hard-coded.
 *
 * LOCAL SANDBOX MODE
 * When VITE_USE_EMULATORS === "true" (set by `npm run dev:sandbox`), this file
 * ignores the real project config entirely and points Auth + Firestore at the
 * local Firebase Emulator Suite. The project id is swapped for a "demo-"
 * prefixed one, which the emulators treat as a project that cannot exist in
 * production — so even a missed connect() call cannot reach real user data.
 *
 * If you see "auth/api-key-not-valid", check:
 *   1. Your .env.local file exists and contains VITE_FIREBASE_API_KEY
 *   2. The key is still active in Firebase Console → Project Settings → General
 *   3. The key has no HTTP referrer restrictions that block localhost
 *      (Google Cloud Console → APIs & Services → Credentials → your Web API key)
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// ─── Sandbox detection ────────────────────────────────────────────────────────

/** True only when the dev server was started with VITE_USE_EMULATORS=true. */
export const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === "true";

/**
 * Emulator-only project id. The "demo-" prefix is meaningful to Firebase:
 * the emulators accept it offline and refuse to talk to production for it.
 * Must match the --project flag in the `emulators` npm script and the
 * PROJECT_ID in scripts/seedEmulator.ts.
 */
const EMULATOR_PROJECT_ID = "demo-higgins-helper";

const EMULATOR_HOST      = "127.0.0.1";
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMU_PORT = 8080;

// ─── Startup diagnostics ──────────────────────────────────────────────────────
// Catch missing env vars before Firebase throws a cryptic error.
// Skipped in sandbox mode, where the real values are deliberately unused.

if (!USE_EMULATORS) {
  // Every lookup below MUST be a static `import.meta.env.VITE_X` property
  // access. Vite can only substitute literal values for static accesses; a
  // dynamic one (import.meta.env[key], or spreading the object) makes it give
  // up and inline the ENTIRE env object into the bundle instead. That ships
  // every VITE_* value in .env.local — including dev-only credentials — to
  // anyone who opens the production JavaScript.
  const missing = Object.entries({
    VITE_FIREBASE_API_KEY:     import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID:      import.meta.env.VITE_FIREBASE_APP_ID,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(
      "[firebase] MISSING environment variables:",
      missing.join(", "),
      "\nMake sure your .env.local file exists at the project root and contains these keys.",
      "\nCopy .env.example → .env.local and fill in the values from Firebase Console → Project Settings."
    );
  }
}

// ─── App initialization ───────────────────────────────────────────────────────

const productionConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// The emulators never validate these — they just have to be well-formed.
const emulatorConfig = {
  apiKey:     "fake-api-key",
  authDomain: `${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`,
  projectId:  EMULATOR_PROJECT_ID,
  appId:      "1:000000000000:web:emulator",
};

const firebaseConfig = USE_EMULATORS ? emulatorConfig : productionConfig;

// Guard against double-initialization in hot-reload dev environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ─── Emulator wiring ──────────────────────────────────────────────────────────
// connectAuthEmulator / connectFirestoreEmulator throw if called twice on the
// same instance, which Vite's HMR would otherwise do on every edit. The flag
// lives on globalThis because the module itself is re-evaluated on reload.

declare global {
  var __HH_EMULATORS_CONNECTED__: boolean | undefined;
}

if (USE_EMULATORS && !globalThis.__HH_EMULATORS_CONNECTED__) {
  globalThis.__HH_EMULATORS_CONNECTED__ = true;

  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMU_PORT);

  console.info(
    `%c[firebase] SANDBOX MODE — project "${EMULATOR_PROJECT_ID}" on local emulators. ` +
      "No production data is reachable. Emulator UI: http://127.0.0.1:4000",
    "color:#b36bff;font-weight:bold",
  );
}
