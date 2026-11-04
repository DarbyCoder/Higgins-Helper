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

/** The page background, used for the Android status bar. Keep in step with index.html. */
const STATUS_BAR: Record<Theme, string> = { dark: "#09090f", light: "#f2f2f9" };

function applyToDom(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", STATUS_BAR[theme]);
  // iOS only reads this at launch, so a theme change shows on the next open
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute("content", theme === "light" ? "default" : "black-translucent");
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
