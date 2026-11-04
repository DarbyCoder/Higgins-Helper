/**
 * @file src/firebase/analytics.ts
 * @description Starts Google Analytics for Firebase, which is what makes
 * visitors show up under Analytics in the Firebase console. Without this call
 * the SDK sends nothing, however many people use the app.
 *
 * Once started it records sessions, first visits and page views by itself,
 * including moving between tabs (GA4 reads the browser history changes).
 *
 * Not started in local test mode or `npm run dev`, so testing doesn't count
 * as users, nor where the browser can't run it (some private modes, and ad
 * blockers stop it loading).
 */
import { LOCAL_MODE } from "./localMode";
import { app } from "./firebaseConfig";

export async function startAnalytics(): Promise<void> {
  if (LOCAL_MODE || import.meta.env.DEV) return;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return;
    // With no VITE_FIREBASE_MEASUREMENT_ID, the SDK looks it up from the app ID
    getAnalytics(app);
  } catch (e) {
    console.warn("[analytics] couldn't start:", e);
  }
}
