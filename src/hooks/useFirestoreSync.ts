/**
 * @file src/hooks/useFirestoreSync.ts
 * @description Orchestrates Firestore hydration and real-time sync for all stores.
 *
 * Called once inside RootLayout (after the user is confirmed authenticated).
 * On mount:
 *   1. Fetches the user's profile doc and hydrates useUserStore
 *   2. Fetches the last 90 days of food logs and hydrates useFoodLogStore
 *   3. Sets up a real-time listener on the user's profile
 *   4. Sets up a real-time listener on today's food log
 *
 * On unmount / user change: tears down all listeners.
 */

import { useEffect, useRef } from "react";
import type { Unsubscribe }  from "firebase/firestore";
import { useAuthStore }      from "@/stores/useAuthStore";
import { useUserStore }      from "@/stores/useUserStore";
import { useFoodLogStore }   from "@/stores/useFoodLogStore";
import { useAIStore }        from "@/stores/useAIStore";
import { useUIStore }        from "@/stores/useUIStore";
import {
  getUserProfile,
  getRecentFoodLogs,
  onUserProfileSnapshot,
  onFoodLogSnapshot,
} from "@/firebase/firestoreService";
import { toLocalDateString } from "@/stores/useDateStore";

export function useFirestoreSync() {
  const uid = useAuthStore((s) => s.user?.uid);

  const hydrateUserStore    = useUserStore((s) => s.hydrateFromFirestore);
  const hydrateFoodLogStore = useFoodLogStore((s) => s.hydrateFromFirestore);
  const clearChat           = useAIStore((s) => s.clearChat);
  const showToast           = useUIStore((s) => s.showToast);

  // Track unsubscribe functions so we can clean them up
  const unsubs = useRef<Unsubscribe[]>([]);

  // Track whether a local write debounce is in-flight (#25).
  // When true, the real-time Firestore snapshot listener for today's food log
  // will skip the update to avoid a remote snapshot overwriting unsaved local changes.
  const localWritePending = useRef(false);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function bootstrap() {
      try {
        // 1. One-time fetch to hydrate stores immediately (fast paint)
        const [profileData, recentLogs] = await Promise.all([
          getUserProfile(uid!),
          getRecentFoodLogs(uid!, 90),
        ]);

        if (cancelled) return;

        if (profileData) hydrateUserStore(profileData);
        hydrateFoodLogStore(recentLogs);

        // 2. Real-time listener: user profile
        const unsubProfile = onUserProfileSnapshot(uid!, (data) => {
          if (data) hydrateUserStore(data);
        });

        // 3. Real-time listener: today's food log (#25)
        // Skip snapshot updates while a local debounce write is pending to
        // prevent a stale server snapshot from overwriting unsaved local state.
        const today = toLocalDateString(new Date());
        const unsubLog = onFoodLogSnapshot(uid!, today, (log) => {
          if (localWritePending.current) return;
          if (log) hydrateFoodLogStore({ [today]: log });
        });

        unsubs.current.push(unsubProfile, unsubLog);
      } catch (err) {
        // #1: Surface sync failures to the user instead of silently swallowing them
        if (!cancelled) {
          console.error("[useFirestoreSync] Bootstrap failed:", err);
          showToast("Could not sync your data. Check your connection and reload.", "error");
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      localWritePending.current = false;
      unsubs.current.forEach((fn) => fn());
      unsubs.current = [];
      // Clear ephemeral chat when user changes / signs out
      clearChat();
    };
  }, [uid, hydrateUserStore, hydrateFoodLogStore, clearChat, showToast]);
}
