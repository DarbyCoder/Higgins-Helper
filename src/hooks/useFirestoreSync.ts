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

  // Track unsubscribe functions so we can clean them up
  const unsubs = useRef<Unsubscribe[]>([]);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function bootstrap() {
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

      // 3. Real-time listener: today's food log
      const today = toLocalDateString(new Date());
      const unsubLog = onFoodLogSnapshot(uid!, today, (log) => {
        if (log) hydrateFoodLogStore({ [today]: log });
      });

      unsubs.current.push(unsubProfile, unsubLog);
    }

    bootstrap().catch(console.error);

    return () => {
      cancelled = true;
      unsubs.current.forEach((fn) => fn());
      unsubs.current = [];
      // Clear ephemeral chat when user changes / signs out
      clearChat();
    };
  }, [uid, hydrateUserStore, hydrateFoodLogStore, clearChat]);
}
