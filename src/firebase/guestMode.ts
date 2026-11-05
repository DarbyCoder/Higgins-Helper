/**
 * @file src/firebase/guestMode.ts
 * @description Entering and leaving guest mode (see stores/guestStorage.ts).
 */
import { useGuestStore } from "@/stores/guestStorage";
import { useUserStore } from "@/stores/useUserStore";
import { useFoodLogStore } from "@/stores/useFoodLogStore";
import { useUIStore } from "@/stores/useUIStore";
import { useDateStore, toLocalDateString } from "@/stores/useDateStore";

/** Read by LoginPage after leaving guest mode: which tab to open on. */
export const LOGIN_MODE_KEY = "higgins-login-mode";

/**
 * Starts guest mode with a blank profile and log, so the guest goes through
 * onboarding like a new account. Saving stops first, so clearing the stores
 * can't wipe what this device holds for an account.
 */
export function startGuestMode() {
  useGuestStore.setState({ isGuest: true });
  useUserStore.setState({ ...useUserStore.getInitialState(), profileStatus: "ready" });
  useFoodLogStore.setState({ ...useFoodLogStore.getInitialState() });
  useUIStore.getState().resetUI();
  useDateStore.getState().setSelectedDate(toLocalDateString());
}

/**
 * Ends guest mode by reloading, which throws away everything held in memory
 * and opens the login screen on `next`.
 */
export function leaveGuestMode(next: "signup" | "signin" = "signup") {
  try { sessionStorage.setItem(LOGIN_MODE_KEY, next); } catch { /* opens on Sign up anyway */ }
  window.location.reload();
}
