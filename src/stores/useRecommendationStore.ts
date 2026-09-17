/**
 * @file src/stores/useRecommendationStore.ts
 * @description Zustand slice caching the optional Gemini "why this" blurb shown
 * above the dashboard's recommended items.
 *
 * Blurbs are keyed by `date|uid|shortlist signature` and persisted to
 * localStorage so revisiting the dashboard never re-calls the API for the same
 * shortlist on the same day. Entries from other days are pruned on each fetch.
 *
 * Failures are remembered for the session (not persisted) and never surfaced —
 * the deterministic recommendations render regardless.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface BlurbRequestBody {
  date: string;
  mealPeriod: string;
  items: Array<{
    name: string;
    calories: number;
    protein: number;
    totalCarbs: number;
    totalFat: number;
    sodium: number;
    fiber: number;
  }>;
  remaining: { calories: number; protein: number; sodium: number; fiber: number };
}

async function fetchBlurb(body: BlurbRequestBody): Promise<string> {
  // Relative URL — routes through Vite proxy in dev, same-origin in prod
  const response = await fetch("/api/ai/recommend-blurb", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Blurb API returned ${response.status}`);
  const data = (await response.json()) as { blurb?: string };
  if (!data.blurb) throw new Error("Blurb API returned no blurb");
  return data.blurb;
}

interface RecommendationState {
  /** Cached blurbs keyed by `date|uid|signature`. Persisted. */
  blurbs: Record<string, string>;
  /** In-flight or failed keys for this session. Not persisted. */
  status: Record<string, "loading" | "error">;

  /** Fetches and caches the blurb for `key` unless cached, loading, or failed. */
  loadBlurb: (key: string, body: BlurbRequestBody) => Promise<void>;
}

export const useRecommendationStore = create<RecommendationState>()(
  persist(
    (set, get) => ({
      blurbs: {},
      status: {},

      loadBlurb: async (key, body) => {
        const { blurbs, status } = get();
        if (blurbs[key] || status[key]) return;

        // Drop blurbs from previous days
        const datePrefix = `${body.date}|`;
        const todays = Object.fromEntries(
          Object.entries(blurbs).filter(([k]) => k.startsWith(datePrefix))
        );
        set({ blurbs: todays, status: { ...status, [key]: "loading" } });

        try {
          const blurb = await fetchBlurb(body);
          set((s) => {
            const { [key]: _done, ...rest } = s.status;
            return { blurbs: { ...s.blurbs, [key]: blurb }, status: rest };
          });
        } catch {
          set((s) => ({ status: { ...s.status, [key]: "error" } }));
        }
      },
    }),
    {
      name:    "higgins-recommendation-blurbs",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ blurbs: state.blurbs }),
    }
  )
);
