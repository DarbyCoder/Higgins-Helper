/**
 * @file src/stores/guestStorage.ts
 * @description Whether the app is in guest mode, and the storage every
 * persisted store writes through, which stops saving while it is.
 *
 * Guest mode keeps nothing: the flag lives only in memory, so a reload or
 * closing the app ends it, and while it's on no store writes to localStorage
 * (and with no signed-in user, nothing reaches Firestore either). Whatever
 * this device had saved for an account before stays untouched underneath.
 *
 * Kept apart from guestMode.ts, which resets the stores, so the stores can
 * import this without importing themselves.
 */
import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";

export const useGuestStore = create<{ isGuest: boolean }>(() => ({ isGuest: false }));

export const isGuest = () => useGuestStore.getState().isGuest;

/** localStorage, except it ignores writes in guest mode. */
export const guardedStorage: StateStorage = {
  getItem:    (key) => localStorage.getItem(key),
  setItem:    (key, value) => { if (!isGuest()) localStorage.setItem(key, value); },
  removeItem: (key) => { if (!isGuest()) localStorage.removeItem(key); },
};
