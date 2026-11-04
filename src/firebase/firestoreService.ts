/**
 * @file src/firebase/firestoreService.ts
 * @description Central Firestore CRUD service for Higgins Helper.
 * All reads/writes to Cloud Firestore go through these functions,
 * keeping Firebase API calls out of Zustand stores and React components.
 *
 * Data model:
 *   users/{uid}/profile         — UserProfile + MacroTargets doc
 *   users/{uid}/foodLogs/{date} — DailyFoodLog doc (one per YYYY-MM-DD), plus an
 *                                 `updatedAt` server timestamp on every write.
 *                                 Docs last written before that field existed
 *                                 don't have it.
 */

import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocsFromServer,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { UserProfile, MacroTargets, DailyFoodLog } from "@/types";

// ─── Types stored in Firestore ────────────────────────────────────────────────

export interface FirestoreUserProfile {
  profile:                UserProfile;
  macroTargets:           MacroTargets;
  macroTargetsManuallySet: boolean;
  overridePresets?:       MacroTargets[];
  activeOverrideIndex?:   number;
  theme:                  "dark" | "light";
  /** Highest intro tour version this user has finished or skipped. Missing = never seen. */
  introVersionSeen?:      number;
  updatedAt:              unknown; // Firestore ServerTimestamp
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/** Fetches a user's profile document once. Returns null if it doesn't exist. */
export async function getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid, "profile", "data"));
  return snap.exists() ? (snap.data() as FirestoreUserProfile) : null;
}

/** Writes (merges) a user's profile to Firestore. */
export async function setUserProfile(
  uid: string,
  data: Omit<FirestoreUserProfile, "updatedAt">,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid, "profile", "data"),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Records that the user has seen the intro tour up to `version`.
 * updateDoc (not a merge-set) so it can never create a profile doc that has
 * only this field — a doc without `profile` would break hydration.
 */
export async function setIntroVersionSeen(uid: string, version: number): Promise<void> {
  await updateDoc(doc(db, "users", uid, "profile", "data"), {
    introVersionSeen: version,
    updatedAt:        serverTimestamp(),
  });
}

/**
 * Subscribes to real-time updates on a user's profile doc.
 * Returns an unsubscribe function — call it on cleanup.
 */
export function onUserProfileSnapshot(
  uid: string,
  callback: (data: FirestoreUserProfile | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid, "profile", "data"),
    (snap) => callback(snap.exists() ? (snap.data() as FirestoreUserProfile) : null),
  );
}

// ─── Food Logs ────────────────────────────────────────────────────────────────

/** A batch of day docs, plus what's needed to ask only for newer ones next time. */
export interface FoodLogBatch {
  logs: Record<string, DailyFoodLog>;
  /** Newest `updatedAt` in the batch, in ms on the server's clock. Null if no doc had one. */
  newestUpdatedAtMs: number | null;
}

/** `updatedAt` is sync bookkeeping, so it stays out of the stores. */
function toDailyFoodLog(data: DocumentData): DailyFoodLog {
  const { updatedAt: _updatedAt, ...log } = data;
  return log as DailyFoodLog;
}

function toFoodLogBatch(snap: QuerySnapshot): FoodLogBatch {
  const batch: FoodLogBatch = { logs: {}, newestUpdatedAtMs: null };
  for (const d of snap.docs) {
    const data = d.data();
    batch.logs[d.id] = toDailyFoodLog(data);
    if (data.updatedAt instanceof Timestamp) {
      batch.newestUpdatedAtMs = Math.max(batch.newestUpdatedAtMs ?? 0, data.updatedAt.toMillis());
    }
  }
  return batch;
}

/**
 * Fetches a single day's food log from the server. Returns null if none exists.
 * Throws when offline, so a caller can't mistake "couldn't check" for "no log".
 */
export async function getDailyFoodLog(uid: string, date: string): Promise<DailyFoodLog | null> {
  const snap = await getDocFromServer(doc(db, "users", uid, "foodLogs", date));
  return snap.exists() ? toDailyFoodLog(snap.data()) : null;
}

/** Writes a full day's food log to Firestore (overwrites the doc). */
export async function setDailyFoodLog(uid: string, date: string, log: DailyFoodLog): Promise<void> {
  await setDoc(doc(db, "users", uid, "foodLogs", date), { ...log, updatedAt: serverTimestamp() });
}

/**
 * Subscribes to real-time updates on a specific day's food log.
 * Returns an unsubscribe function — call it on cleanup / date change.
 */
export function onFoodLogSnapshot(
  uid: string,
  date: string,
  callback: (log: DailyFoodLog | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid, "foodLogs", date),
    (snap) => callback(snap.exists() ? toDailyFoodLog(snap.data()) : null),
  );
}

/**
 * Fetches the N most recent food log docs for a user: the full sync, costing one
 * read per doc.
 *
 * Asks the server directly. Offline, a plain getDocs() answers with an empty list
 * from the cache instead of failing, which would look like a synced, empty log.
 */
export async function getRecentFoodLogs(uid: string, days = 90): Promise<FoodLogBatch> {
  const q = query(
    collection(db, "users", uid, "foodLogs"),
    orderBy("date", "desc"),
    limit(days),
  );
  return toFoodLogBatch(await getDocsFromServer(q));
}

/**
 * Fetches only the day docs written at or after `sinceMs` (server clock), from any
 * device and for any date. Costs one read per doc returned, and one if there are none.
 * Null means from the beginning, which returns every doc that has an `updatedAt`.
 *
 * Firestore leaves docs without the field out of this query, so it only works on
 * top of a full sync, which is what picks up docs from before the field existed.
 */
export async function getFoodLogsChangedSince(
  uid: string,
  sinceMs: number | null,
): Promise<FoodLogBatch> {
  const q = query(
    collection(db, "users", uid, "foodLogs"),
    where("updatedAt", ">=", Timestamp.fromMillis(sinceMs ?? 0)),
  );
  return toFoodLogBatch(await getDocsFromServer(q));
}
