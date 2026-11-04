/**
 * @file src/hooks/useFirestoreSync.ts
 * @description Orchestrates Firestore hydration and real-time sync for all stores.
 *
 * Called once inside App, above AuthGate. On sign-in or app open:
 *   1. Drops the cached food log if it's recorded as another account's
 *   2. Fetches the user's profile doc and hydrates useUserStore
 *   3. Brings the cached food log up to date (see below)
 *   4. Sets up a real-time listener on the user's profile
 *   5. Sets up a real-time listener on today's food log
 *   6. Re-reads a past day the first time it's selected this session
 *
 * On unmount / user change: tears down all listeners.
 *
 * READS PER OPEN
 * The food log is saved on the device, so most opens only ask for what changed:
 *   - Returning user: profile (1) + day docs changed since the last sync (1 or 2
 *     typically; one is the overlap below) + the two listeners (2), so 4 or 5.
 *   - Full sync: up to 90 day docs instead of the changed ones, so up to 93. Runs
 *     when this device holds no synced log for this user (new device, cleared data,
 *     account switch, or the first open since `logSync` was added), and every
 *     FULL_SYNC_INTERVAL_MS after that.
 *
 * HOW A DAY EDITED ON ANOTHER DEVICE ARRIVES
 *   - On the next app open: every write stamps the doc's `updatedAt`, and the
 *     changed-since query finds it whatever its date.
 *   - While the app stays open: today through its listener; any other past day
 *     when it's first selected in the session (step 6). A past day already viewed
 *     this session stays as it was until the next open.
 *   - Writes that don't stamp `updatedAt` (an app version from before the field)
 *     are invisible to the query, so they arrive by step 6 or the periodic full sync.
 *
 * Step 6 also protects data: a day doc is overwritten whole on save, so editing a
 * stale copy of a day would erase whatever the other device added to it.
 */

import { useLayoutEffect, useRef } from "react";
import type { Unsubscribe }  from "firebase/firestore";
import { useAuthStore }      from "@/stores/useAuthStore";
import { useUserStore }      from "@/stores/useUserStore";
import { useFoodLogStore }   from "@/stores/useFoodLogStore";
import { useUIStore }        from "@/stores/useUIStore";
import { useDateStore, toLocalDateString } from "@/stores/useDateStore";
import {
  getUserProfile,
  getRecentFoodLogs,
  getFoodLogsChangedSince,
  getDailyFoodLog,
  onUserProfileSnapshot,
  onFoodLogSnapshot,
} from "@/firebase/firestoreService";

/** How many day docs a full sync downloads. */
const FULL_SYNC_DAYS = 90;

/**
 * Full sync interval even when this device is up to date. A backstop for writes the
 * changed-since query can't see (see above). Being away longer than this also ends
 * in a full sync, which caps how many docs a changed-since query can return.
 */
const FULL_SYNC_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How far before the cursor the changed-since query starts. The server stamps
 * `updatedAt` slightly before a write becomes visible, so a write stamped just
 * before the newest doc we saw might not have been visible when we looked. Re-reads
 * the docs in this window, usually just the newest one.
 */
const CURSOR_OVERLAP_MS = 5 * 60 * 1000;

export function useFirestoreSync() {
  const uid = useAuthStore((s) => s.user?.uid);

  const hydrateUserStore    = useUserStore((s) => s.hydrateFromFirestore);
  const setProfileStatus    = useUserStore((s) => s.setProfileStatus);
  const hydrateFoodLogStore = useFoodLogStore((s) => s.hydrateFromFirestore);
  const claimLogCache       = useFoodLogStore((s) => s.claimLogCache);
  const applyLogSync        = useFoodLogStore((s) => s.applyLogSync);
  const showToast           = useUIStore((s) => s.showToast);

  // Track unsubscribe functions so we can clean them up
  const unsubs = useRef<Unsubscribe[]>([]);

  // A layout effect, not a plain one: AuthGate lets returning users straight through,
  // so the previous account's log has to be gone (and its fetches cancelled) before
  // the browser paints the first frame for the new account.
  useLayoutEffect(() => {
    if (!uid) return;

    let cancelled = false;
    const listenedDate = toLocalDateString(new Date());

    claimLogCache(uid);

    async function bootstrap() {
      try {
        const sync = useFoodLogStore.getState().logSync;
        const needsFullSync =
          !sync ||
          sync.uid !== uid ||
          Date.now() - sync.lastFullSyncAt > FULL_SYNC_INTERVAL_MS;

        // 1. One-time fetch to hydrate stores immediately (fast paint)
        const [profileData, logBatch] = await Promise.all([
          getUserProfile(uid!),
          needsFullSync
            ? getRecentFoodLogs(uid!, FULL_SYNC_DAYS)
            : getFoodLogsChangedSince(
                uid!,
                sync.cursorMs === null ? null : sync.cursorMs - CURSOR_OVERLAP_MS,
              ),
        ]);

        if (cancelled) return;

        if (profileData) hydrateUserStore(profileData);
        applyLogSync(uid!, logBatch.logs, logBatch.newestUpdatedAtMs, needsFullSync);

        // Firestore has now answered, so AuthGate can safely decide between
        // the app and the onboarding wizard. Also reached when profileData is
        // null, which is the genuine "needs onboarding" case.
        setProfileStatus("ready");

        // 2. Real-time listener: user profile
        const unsubProfile = onUserProfileSnapshot(uid!, (data) => {
          if (data) hydrateUserStore(data);
        });

        // 3. Real-time listener: today's food log
        // The store skips a snapshot while a local write to this day is on its way (#25).
        const unsubLog = onFoodLogSnapshot(uid!, listenedDate, (log) => {
          if (log) hydrateFoodLogStore({ [listenedDate]: log });
        });

        unsubs.current.push(unsubProfile, unsubLog);
      } catch (err) {
        // #1: Surface sync failures to the user instead of silently swallowing them
        if (!cancelled) {
          console.error("[useFirestoreSync] Bootstrap failed:", err);
          // Deliberately NOT "ready": a failed read must not be mistaken for
          // "this user has no profile", which would trigger the onboarding
          // wizard and overwrite real data.
          setProfileStatus("error");
          showToast("Could not sync your data. Check your connection and reload.", "error");
        }
      }
    }

    // 4. Re-read a past day the first time it's selected this session. This also
    // loads days older than the device keeps. Future days are left out: they cost a
    // read every time someone browses ahead in the menu, and the open's changed-since
    // query already covers them.
    const refreshedDays = new Set<string>();

    async function refreshSelectedDay(date: string) {
      if (date === listenedDate || date > toLocalDateString() || refreshedDays.has(date)) return;
      refreshedDays.add(date);

      const before = useFoodLogStore.getState().foodLog[date];
      try {
        const log = await getDailyFoodLog(uid!, date);
        if (cancelled) return;
        // If the day was edited during the read, the local copy is the newer one.
        if (log && useFoodLogStore.getState().foodLog[date] === before) {
          hydrateFoodLogStore({ [date]: log });
        }
      } catch (err) {
        refreshedDays.delete(date); // Try again next time it's selected
        console.warn(`[useFirestoreSync] Could not refresh ${date}:`, err);
      }
    }

    bootstrap();

    void refreshSelectedDay(useDateStore.getState().selectedDate);
    unsubs.current.push(
      useDateStore.subscribe((s) => void refreshSelectedDay(s.selectedDate)),
    );

    return () => {
      cancelled = true;
      // Next user (or the next sign-in) must re-check Firestore from scratch.
      setProfileStatus("checking");
      unsubs.current.forEach((fn) => fn());
      unsubs.current = [];
    };
  }, [uid, hydrateUserStore, hydrateFoodLogStore, claimLogCache, applyLogSync, setProfileStatus, showToast]);
}
