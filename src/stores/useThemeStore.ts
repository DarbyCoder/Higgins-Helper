/**
 * @file src/stores/useThemeStore.ts
 * @description Zustand slice managing light/dark theme preference.
 * Persisted to localStorage. Applies the `data-theme` attribute to
 * `document.documentElement` immediately on any change.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  /** Call once on app mount to sync the DOM with the persisted theme. */
  applyTheme: () => void;
}

function applyToDom(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",

      toggleTheme: () =>
        set((state) => {
          const next: Theme = state.theme === "dark" ? "light" : "dark";
          applyToDom(next);
          return { theme: next };
        }),

      setTheme: (theme) => {
        applyToDom(theme);
        set({ theme });
      },

      applyTheme: () => applyToDom(get().theme),
    }),
    {
      name: "higgins-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
