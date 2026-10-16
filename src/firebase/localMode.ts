/**
 * @file src/firebase/localMode.ts
 * @description Local test mode, started with `npm run dev:local`.
 *
 * The app runs without signing in: Firebase Auth is never asked who the user
 * is, so no user is ever set, and every Firestore read and write is skipped
 * (they all need a uid). The profile, food log and settings live only in this
 * browser's localStorage — nothing reaches a real account.
 *
 * `import.meta.env.DEV` is false in `vite build`, so a production bundle can
 * never run in local mode, even if VITE_LOCAL_MODE is set where it's built.
 */
export const LOCAL_MODE = import.meta.env.DEV && import.meta.env.VITE_LOCAL_MODE === "true";
