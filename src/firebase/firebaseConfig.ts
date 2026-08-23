/**
 * @file src/firebase/firebaseConfig.ts
 * @description Firebase app initialization. Exports the Auth and Firestore
 * instances used throughout the app. All config values come from Vite
 * environment variables (VITE_FIREBASE_*) so no secrets are hard-coded.
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfe9kDFczq2aqL154l9mpbPHoDTORLZQE",
  authDomain: "higgins-helper-de50c.firebaseapp.com",
  projectId: "higgins-helper-de50c",
  storageBucket: "higgins-helper-de50c.firebasestorage.app",
  messagingSenderId: "796882247014",
  appId: "1:796882247014:web:736cb5628040bc3ed1fca7",
  measurementId: "G-XE2BQW9LV5"
};

// Guard against double-initialization in hot-reload dev environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
