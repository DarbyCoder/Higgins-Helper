/**
 * @file src/firebase/firebaseConfig.ts
 * @description Firebase app initialization. Exports the Auth and Firestore
 * instances used throughout the app. All config values come from Vite
 * environment variables (VITE_FIREBASE_*) so no secrets are hard-coded.
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

// ─── Startup diagnostics ──────────────────────────────────────────────────────
// Catch missing env vars before Firebase throws a cryptic error.

const REQUIRED_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missing = REQUIRED_VARS.filter((k) => !import.meta.env[k]);
if (missing.length > 0) {
  console.error(
    "[firebase] MISSING environment variables:",
    missing.join(", "),
    "\nMake sure your .env.local file exists at the project root and contains these keys.",
    "\nCopy .env.example → .env.local and fill in the values from Firebase Console → Project Settings."
  );
}

// ─── App initialization ───────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Guard against double-initialization in hot-reload dev environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
