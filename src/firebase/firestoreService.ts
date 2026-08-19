/**
 * @file src/firebase/firestoreService.ts
 * @description Central Firestore CRUD service for Higgins Helper.
 * All reads/writes to Cloud Firestore go through these functions,
 * keeping Firebase API calls out of Zustand stores and React components.
 *
 * Data model:
 *   users/{uid}/profile         — UserProfile + MacroTargets doc
 *   users/{uid}/foodLogs/{date} — DailyFoodLog doc (one per YYYY-MM-DD)
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
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

/** Fetches a single day's food log. Returns null if none exists. */
export async function getDailyFoodLog(uid: string, date: string): Promise<DailyFoodLog | null> {
  const snap = await getDoc(doc(db, "users", uid, "foodLogs", date));
  return snap.exists() ? (snap.data() as DailyFoodLog) : null;
}

/** Writes a full day's food log to Firestore (overwrites the doc). */
export async function setDailyFoodLog(uid: string, date: string, log: DailyFoodLog): Promise<void> {
  await setDoc(doc(db, "users", uid, "foodLogs", date), log);
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
    (snap) => callback(snap.exists() ? (snap.data() as DailyFoodLog) : null),
  );
}

/**
 * Fetches the N most recent food log docs for a user.
 * Used for hydrating the Zustand store with recent history on login.
 */
export async function getRecentFoodLogs(
  uid: string,
  days = 90,
): Promise<Record<string, DailyFoodLog>> {
  const q = query(
    collection(db, "users", uid, "foodLogs"),
    orderBy("date", "desc"),
    limit(days),
  );
  const snap = await getDocs(q);
  const result: Record<string, DailyFoodLog> = {};
  snap.forEach((d) => {
    result[d.id] = d.data() as DailyFoodLog;
  });
  return result;
}
