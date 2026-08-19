/**
 * @file src/stores/useAuthStore.ts
 * @description Zustand slice for Firebase Auth state.
 * Tracks the currently signed-in user and loading state.
 * The AuthProvider subscribes to onAuthStateChanged and calls setUser/clearUser.
 */

import { create } from "zustand";
import type { User } from "firebase/auth";

interface AuthState {
  user:    User | null;
  loading: boolean;
  error:   string | null;

  setUser:    (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError:   (error: string | null) => void;
  clearUser:  () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,   // true until Firebase resolves initial auth state
  error:   null,

  setUser:    (user)    => set({ user, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error, loading: false }),
  clearUser:  ()        => set({ user: null, loading: false, error: null }),
}));
