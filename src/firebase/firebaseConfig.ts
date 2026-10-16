/**
 * @file src/firebase/firebaseConfig.ts
 * @description Firebase app initialization. Exports the Auth and Firestore
 * instances used throughout the app. All config values come from Vite
 * environment variables (VITE_FIREBASE_*) so no secrets are hard-coded.
 * Vite inlines these at BUILD time, so on Render they must be set before the
 * build runs (see .env.example).
 *
 * LOCAL TEST MODE
 * In `npm run dev:local` (see localMode.ts) the app never talks to Firebase.
 * It still gets a placeholder config so the SDK can initialize, and the
 * placeholder's made-up project means a stray call can't reach real data.
 *
 * If you see "auth/api-key-not-valid", check:
 *   1. Your .env.local file exists and contains VITE_FIREBASE_API_KEY
 *   2. The key is still active in Firebase Console → Project Settings → General
 *   3. The key has no HTTP referrer restrictions that block localhost
 *      (Google Cloud Console → APIs & Services → Credentials → your Web API key)
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { LOCAL_MODE } from "./localMode";

// ─── Startup diagnostics ──────────────────────────────────────────────────────
// Catch missing env vars before Firebase throws a cryptic error.
// Skipped in local test mode, which doesn't use them.

if (!LOCAL_MODE) {
  // Every lookup below MUST be a static `import.meta.env.VITE_X` property
  // access. Vite can only substitute literal values for static accesses; a
  // dynamic one (import.meta.env[key], or spreading the object) makes it give
  // up and inline the ENTIRE env object into the bundle instead. That ships
  // every VITE_* value in .env.local to anyone who opens the production
  // JavaScript.
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
      "\nLocally: copy .env.example → .env.local and fill in the values from Firebase Console → Project Settings.",
      "\nOn Render: add them under Environment, then redeploy (they are baked in at build time)."
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

// Never validated, because local mode makes no Firebase calls — it only has
// to be well-formed. "demo-" project ids can't exist in production.
const localModeConfig = {
  apiKey:     "local-mode",
  authDomain: "localhost",
  projectId:  "demo-higgins-local",
  appId:      "1:000000000000:web:local",
};

const firebaseConfig = LOCAL_MODE ? localModeConfig : productionConfig;

// Guard against double-initialization in hot-reload dev environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
