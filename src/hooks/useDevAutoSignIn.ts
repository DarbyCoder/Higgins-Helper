/**
 * @file src/hooks/useDevAutoSignIn.ts
 * @description Signs into the seeded emulator test account automatically so
 * local sandbox runs land straight on the dashboard instead of the login page.
 *
 * Only ever runs when VITE_USE_EMULATORS === "true". In any other build the
 * flag is undefined, the guard folds to `if (false)` at build time, and the
 * whole branch is dropped — so this can never fire against production.
 *
 * The credentials come from VITE_DEV_AUTH_EMAIL / VITE_DEV_AUTH_PASSWORD in
 * .env.local and must match the account created by scripts/seedEmulator.ts.
 */

import { useEffect, useRef } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Module-local so the minifier can fold it to a literal false in any build that
 * did not set the flag, which lets it delete the guarded block below. Importing
 * the equivalent constant from another module is not reliably foldable.
 */
const SANDBOX = import.meta.env.VITE_USE_EMULATORS === "true";

export function useDevAutoSignIn() {
  const user    = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // One attempt per page load — a failed sign-in leaves user null forever,
  // and without this the effect would retry on every unrelated re-render.
  const attempted = useRef(false);

  useEffect(() => {
    // Whole block is compiled away when SANDBOX folds to false — see above.
    if (SANDBOX) {
      if (loading || user || attempted.current) return;

      const email    = import.meta.env.VITE_DEV_AUTH_EMAIL;
      const password = import.meta.env.VITE_DEV_AUTH_PASSWORD;
      if (!email || !password) {
        console.warn(
          "[dev-auth] dev credentials not set in .env.local — " +
            "sign in by hand, or add them and re-run `npm run seed`.",
        );
        return;
      }

      attempted.current = true;
      signInWithEmailAndPassword(auth, email, password)
        .then(() => console.info(`[dev-auth] Signed into emulator account ${email}`))
        .catch((err) => {
          console.error(
            "[dev-auth] Auto sign-in failed — the emulator has no such user. " +
              "Run `npm run seed` while the emulators are up.",
            err,
          );
        });
    }
  }, [loading, user]);
}
