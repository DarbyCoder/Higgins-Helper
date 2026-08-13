/**
 * @file src/stores/useAIStore.ts
 * @description Zustand slice for the AI nutritionist chat feature (Gemini API).
 *
 * BUG FIX: History must be captured BEFORE the optimistic user-message is
 * added to the store, otherwise the user message appears twice in the
 * conversation sent to Gemini (causing a duplicate-turn rejection error).
 *
 * API calls use relative URLs (no explicit host) so they route through the
 * Vite dev proxy in development and are same-origin in production.
 */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { AIChatMessage, MacroTotals, MacroTargets } from "../types/index.js";

// ─── API Layer ────────────────────────────────────────────────────────────────

interface AIChatRequestBody {
  message: string;
  context: {
    dailyTotals: MacroTotals;
    macroTargets: MacroTargets;
    userName?: string;
    goal?: string;
    dietaryRestrictions?: string[];
    todayLog?: Array<{ name: string; calories: number; mealSlot: string }>;
    yesterdayLog?: Array<{ name: string; calories: number; mealSlot: string }>;
  };
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

async function sendChatMessage(body: AIChatRequestBody): Promise<string> {
  // Use relative URL — routes through Vite proxy in dev, same-origin in prod
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMsg = `AI API returned ${response.status}: ${response.statusText}`;
    try {
      const errBody = await response.json() as { error?: string; message?: string };
      if (errBody.message) errorMsg = errBody.message;
    } catch { /* ignore JSON parse failure */ }
    throw new Error(errorMsg);
  }

  const data = (await response.json()) as { reply: string };
  return data.reply;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface AIState {
  chatHistory: AIChatMessage[];
  isLoading: boolean;
  error: string | null;

  sendMessage: (
    message: string,
    context: AIChatRequestBody["context"]
  ) => Promise<void>;

  clearChat: () => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useAIStore = create<AIState>((set, get) => ({
  chatHistory: [],
  isLoading: false,
  error: null,

  sendMessage: async (message, context) => {
    // ── CRITICAL: Capture history snapshot BEFORE adding the user message ──
    // If captured after the optimistic set(), the new user message would be
    // included in `history` AND sent as `message` — causing duplicate turns
    // that the Gemini API rejects with a 400 error.
    const historySnapshot = get().chatHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // ── Optimistically append user message to UI ──
    const userMessage: AIChatMessage = {
      id: uuidv4(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      chatHistory: [...state.chatHistory, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const reply = await sendChatMessage({
        message,
        context,
        history: historySnapshot, // ← uses pre-optimistic snapshot, no duplicate
      });

      const assistantMessage: AIChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        chatHistory: [...state.chatHistory, assistantMessage],
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get AI response";
      console.error("[useAIStore] sendMessage error:", err);

      const errorChatMessage: AIChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: `⚠️ ${errorMessage}\n\nIf this is your first time using the AI advisor, make sure \`GEMINI_API_KEY\` is set in your server environment.`,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        chatHistory: [...state.chatHistory, errorChatMessage],
        isLoading: false,
        error: errorMessage,
      }));
    }
  },

  clearChat: () => set({ chatHistory: [], error: null }),
}));
