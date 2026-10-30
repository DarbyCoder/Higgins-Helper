/**
 * @file src/hooks/useInstallPrompt.ts
 * @description PWA install support for the "Install" option on the Profile page.
 *
 * Browsers fire `beforeinstallprompt` once, early in the page load — usually
 * before anyone opens Profile — so the listener is registered when this module
 * loads (main.tsx imports it at startup), not when a component mounts.
 * preventDefault() also stops Chrome's own install mini-infobar: installing is
 * offered only from Profile, never as a banner.
 */
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed", platform: string }>;
  prompt(): Promise<void>;
}

interface InstallState {
  /** The browser's saved install prompt, or null if it hasn't offered one. */
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Running as the installed app, or installed during this visit. */
  installed: boolean;
}

/** iOS has no install prompt; people add the app from Safari's Share sheet. */
export const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; touch support gives it away
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

let state: InstallState = {
  deferredPrompt: null,
  installed:
    window.matchMedia("(display-mode: standalone)").matches ||
    // Home Screen web apps on iOS
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  setState({ deferredPrompt: e as BeforeInstallPromptEvent });
});

window.addEventListener("appinstalled", () => {
  setState({ deferredPrompt: null, installed: true });
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInstallPrompt() {
  const { deferredPrompt, installed } = useSyncExternalStore(subscribe, () => state);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // A prompt can be shown only once. If it was accepted, `appinstalled`
    // marks the app installed; if not, the browser may offer a new one later.
    setState({ deferredPrompt: null });
  };

  return { isInstallable: deferredPrompt !== null && !installed, isInstalled: installed, promptInstall };
}
