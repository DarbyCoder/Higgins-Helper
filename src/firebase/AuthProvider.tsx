/**
 * @file src/firebase/AuthProvider.tsx
 * @description React context provider for Firebase Authentication.
 * Subscribes to onAuthStateChanged on mount and keeps useAuthStore in sync.
 * Also wires up sign-in, sign-up, Google sign-in, and sign-out helpers
 * so any component can call them via the useAuth() hook.
 */

import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebaseConfig";
import { useAuthStore } from "@/stores/useAuthStore";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:             User | null;
  loading:          boolean;
  error:            string | null;
  signIn:           (email: string, password: string) => Promise<void>;
  signUp:           (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, error, setUser, clearUser, setError } = useAuthStore();

  // Subscribe to Firebase auth state changes once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => setUser(firebaseUser),
      (err)          => setError(err.message),
    );
    return unsubscribe;
  }, [setUser, setError]);

  // ── Auth Actions ──────────────────────────────────────────────────────────

  async function signIn(email: string, password: string) {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyAuthError(err));
      throw err;
    }
  }

  async function signUp(email: string, password: string, displayName: string) {
    try {
      setError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      setUser({ ...cred.user, displayName });
    } catch (err) {
      setError(friendlyAuthError(err));
      throw err;
    }
  }

  async function signInWithGoogle() {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(friendlyAuthError(err));
      throw err;
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    clearUser();
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function friendlyAuthError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential"))
      return "Incorrect email or password.";
    if (msg.includes("email-already-in-use"))
      return "An account with this email already exists.";
    if (msg.includes("weak-password"))
      return "Password must be at least 6 characters.";
    if (msg.includes("invalid-email"))
      return "Please enter a valid email address.";
    if (msg.includes("popup-closed-by-user"))
      return "Google sign-in was cancelled.";
    return msg;
  }
  return "An unexpected error occurred.";
}
