/**
 * @file src/stores/useUserStore.ts
 * @description Zustand slice for user profile and macro targets.
 *
 * Source of truth: Cloud Firestore (users/{uid}/profile/data).
 * localStorage persist middleware acts as an offline cache for fast initial paint.
 *
 * Firestore writes are triggered by setUserProfile and setMacroTargets.
 * hydrateFromFirestore is called by useFirestoreSync after login to load the
 * authoritative server-side data into the store.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  UserProfile,
  MacroTargets,
  ActivityLevel,
  WeightGoal,
} from "../types/index.js";
import { setUserProfile as fsSetUserProfile } from "@/firebase/firestoreService";
import { useAuthStore } from "./useAuthStore.js";
import type { FirestoreUserProfile } from "@/firebase/firestoreService";

// ─── TDEE / Macro Calculator ──────────────────────────────────────────────────

/**
 * Activity multipliers from the Harris-Benedict TDEE equation.
 */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,
  active:     1.725,
  very_active: 1.9,
};

/**
 * Calorie adjustment per goal:
 *  - lose: 500 kcal deficit (~1 lb/week loss)
 *  - maintain: no adjustment
 *  - gain: 300 kcal surplus (~0.5 lb/week lean gain)
 */
const GOAL_ADJUSTMENTS: Record<WeightGoal, number> = {
  lose:     -500,
  maintain: 0,
  gain:     300,
};

/**
 * Calculates recommended macro targets from a UserProfile using the
 * Mifflin-St Jeor BMR equation + Harris-Benedict activity multipliers.
 *
 * Protein:  0.8g–1.2g per pound of bodyweight depending on goal
 * Fat:      25–30% of total calories
 * Carbs:    Remaining calories after protein and fat are allocated
 * Fiber:    FDA recommendation: 28g/day
 * Sodium:   FDA recommendation: <2300mg/day
 */
export function calculateMacroTargets(profile: UserProfile): MacroTargets {
  // ── Convert units to metric for the formula ──
  const weightKg =
    profile.weightUnit === "lbs" ? profile.weight * 0.453592 : profile.weight;
  const heightCm =
    profile.heightUnit === "in" ? profile.height * 2.54 : profile.height;

  // ── Mifflin-St Jeor BMR ──
  const bmr =
    profile.sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * profile.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * profile.age - 161;

  // ── TDEE with activity multiplier ──
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];

  // ── Apply goal adjustment ──
  const targetCalories = Math.round(tdee + GOAL_ADJUSTMENTS[profile.goal]);

  // ── Macro allocation ──
  const weightLbs =
    profile.weightUnit === "kg" ? profile.weight * 2.20462 : profile.weight;

  // Protein: 0.8g/lb for maintain/lose, 1.0g/lb for gain
  const proteinPerLb = profile.goal === "gain" ? 1.0 : 0.8;
  const proteinGrams = Math.round(weightLbs * proteinPerLb);

  // Fat: 28% of calories
  const fatGrams = Math.round((targetCalories * 0.28) / 9);

  // Carbs: remaining calories after protein and fat
  const proteinCalories = proteinGrams * 4;
  const fatCalories     = fatGrams * 9;
  const carbCalories    = targetCalories - proteinCalories - fatCalories;
  const carbGrams       = Math.max(0, Math.round(carbCalories / 4));

  return {
    calories:   targetCalories,
    protein:    proteinGrams,
    totalFat:   fatGrams,
    totalCarbs: carbGrams,
    fiber:      28,    // FDA standard recommendation
    sodium:     2300,  // FDA upper limit
  };
}

// ─── Default Targets ──────────────────────────────────────────────────────────

/**
 * Sensible defaults shown before a user completes their profile.
 * Based on a 2000-calorie reference diet.
 */
const DEFAULT_MACRO_TARGETS: MacroTargets = {
  calories:   2000,
  protein:    50,
  totalFat:   65,
  totalCarbs: 275,
  fiber:      28,
  sodium:     2300,
};

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface UserState {
  /** The user's profile. Null until the onboarding flow is completed. */
  userProfile: UserProfile | null;

  /** Current macro targets — auto-computed or manually set. */
  macroTargets: MacroTargets;

  /**
   * Whether the macro targets were manually overridden.
   * If false, targets will be automatically recomputed whenever the profile changes.
   */
  macroTargetsManuallySet: boolean;

  /**
   * Saves a user profile and recomputes macro targets (unless manually overridden).
   * Also persists to Firestore if the user is signed in.
   */
  setUserProfile: (profile: UserProfile) => void;

  /**
   * Manually sets macro targets.
   * Sets macroTargetsManuallySet = true, preventing future auto-recalculation.
   * Also persists to Firestore if the user is signed in.
   */
  setMacroTargets: (targets: MacroTargets) => void;

  /**
   * Resets macro targets to auto-calculated values from the current profile.
   * Clears the manual override flag.
   * Also persists to Firestore.
   */
  resetMacroTargetsToAuto: () => void;

  /** Returns whether the user has completed onboarding. */
  hasCompletedOnboarding: () => boolean;

  /**
   * Hydrates the store from a Firestore profile snapshot.
   * Called by useFirestoreSync after login. Does NOT trigger a Firestore write.
   */
  hydrateFromFirestore: (data: FirestoreUserProfile) => void;
}

// ─── Helper: persist to Firestore ────────────────────────────────────────────

function persistToFirestore(state: {
  userProfile: UserProfile | null;
  macroTargets: MacroTargets;
  macroTargetsManuallySet: boolean;
}) {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid || !state.userProfile) return;
  fsSetUserProfile(uid, {
    profile:                state.userProfile,
    macroTargets:           state.macroTargets,
    macroTargetsManuallySet: state.macroTargetsManuallySet,
    theme:                  (document.documentElement.dataset.theme ?? "dark") as "dark" | "light",
  }).catch(console.error);
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      userProfile:             null,
      macroTargets:            DEFAULT_MACRO_TARGETS,
      macroTargetsManuallySet: false,

      setUserProfile: (profile) => {
        const shouldRecalculate = !get().macroTargetsManuallySet;
        const newMacroTargets   = shouldRecalculate
          ? calculateMacroTargets(profile)
          : get().macroTargets;

        set({
          userProfile: profile,
          macroTargets: newMacroTargets,
        });

        persistToFirestore({
          userProfile:             profile,
          macroTargets:            newMacroTargets,
          macroTargetsManuallySet: get().macroTargetsManuallySet,
        });
      },

      setMacroTargets: (targets) => {
        set({ macroTargets: targets, macroTargetsManuallySet: true });
        persistToFirestore({
          userProfile:             get().userProfile,
          macroTargets:            targets,
          macroTargetsManuallySet: true,
        });
      },

      resetMacroTargetsToAuto: () => {
        const profile = get().userProfile;
        if (!profile) return;
        const newTargets = calculateMacroTargets(profile);
        set({ macroTargets: newTargets, macroTargetsManuallySet: false });
        persistToFirestore({
          userProfile:             profile,
          macroTargets:            newTargets,
          macroTargetsManuallySet: false,
        });
      },

      hasCompletedOnboarding: () => get().userProfile !== null,

      hydrateFromFirestore: (data) => {
        // Hydrate without triggering a write back to Firestore
        set({
          userProfile:             data.profile,
          macroTargets:            data.macroTargets,
          macroTargetsManuallySet: data.macroTargetsManuallySet,
        });
      },
    }),

    {
      name:    "higgins-user-profile",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfile:             state.userProfile,
        macroTargets:            state.macroTargets,
        macroTargetsManuallySet: state.macroTargetsManuallySet,
      }),
    }
  )
);
