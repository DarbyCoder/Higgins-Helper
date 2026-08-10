/**
 * @file src/stores/index.ts
 * @description Barrel re-export for all Zustand stores.
 *
 * @example
 * import { useFoodLogStore, useDateStore, useThemeStore } from '@/stores';
 */

export { useDateStore, toLocalDateString, offsetDate } from "./useDateStore.js";
export { useMenuStore } from "./useMenuStore.js";
export { useFoodLogStore } from "./useFoodLogStore.js";
export { useUserStore, calculateMacroTargets } from "./useUserStore.js";
export { useUIStore } from "./useUIStore.js";
export { useAIStore } from "./useAIStore.js";
export { useThemeStore } from "./useThemeStore.js";
