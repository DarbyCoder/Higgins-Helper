/**
 * @file server/services/aiNutritionist.ts
 * @description Gemini API integration for the AI nutritionist advisor.
 *
 * Uses the Gemini 1.5 Flash model (Option B: Google AI Studio API key).
 * Each request injects the user's daily nutrition context so the AI can
 * provide highly personalized, grounded responses.
 *
 * Environment variable required:
 *   GEMINI_API_KEY=your_google_ai_studio_api_key
 *
 * Get a free API key at: https://aistudio.google.com/apikey
 */

import axios, { AxiosError } from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatContext {
  dailyTotals: {
    calories: number;
    protein: number;
    totalFat: number;
    totalCarbs: number;
    sodium: number;
    fiber: number;
  };
  macroTargets: {
    calories: number;
    protein: number;
    totalFat: number;
    totalCarbs: number;
    fiber: number;
    sodium: number;
  };
  userName?: string;
  goal?: string;
  dietaryRestrictions?: string[];
  todayLog?: Array<{ name: string; calories: number; mealSlot: string }>;
  yesterdayLog?: Array<{ name: string; calories: number; mealSlot: string }>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: ChatContext): string {
  const { dailyTotals: t, macroTargets: targets, userName, goal, dietaryRestrictions } = ctx;

  const caloriesLeft = targets.calories - t.calories;
  const proteinLeft = targets.protein - t.protein;

  const restrictionText = dietaryRestrictions?.length
    ? `Their dietary preferences include: ${dietaryRestrictions.join(", ")}.`
    : "";

  const formatLog = (log?: Array<{ name: string; calories: number; mealSlot: string }>) => {
    if (!log || log.length === 0) return "No food logged.";
    return log.map((item) => `- ${item.mealSlot}: ${item.name} (${item.calories} cal)`).join("\n");
  };

  const todayLogStr = formatLog(ctx.todayLog);
  const yesterdayLogStr = formatLog(ctx.yesterdayLog);

  return `You are HigginsHelper's AI Nutritionist, a friendly, expert nutrition advisor for Clark University students.
You have access to the user's real-time food log and nutritional data.

USER CONTEXT:
- Name: ${userName ?? "Student"}
- Goal: ${goal ?? "maintain weight"}
- ${restrictionText}

TODAY'S MACROS:
- Calories eaten: ${t.calories} / ${targets.calories} target (${caloriesLeft > 0 ? `${caloriesLeft} remaining` : `${Math.abs(caloriesLeft)} over goal`})
- Protein: ${t.protein.toFixed(0)}g / ${targets.protein}g (${proteinLeft > 0 ? `${proteinLeft.toFixed(0)}g to go` : "goal reached!"})
- Carbohydrates: ${t.totalCarbs.toFixed(0)}g / ${targets.totalCarbs}g
- Fat: ${t.totalFat.toFixed(0)}g / ${targets.totalFat}g
- Fiber: ${t.fiber.toFixed(0)}g / ${targets.fiber}g
- Sodium: ${Math.round(t.sodium)}mg / ${targets.sodium}mg

TODAY'S FOOD ITEMS LOGGED:
${todayLogStr}

YESTERDAY'S FOOD ITEMS LOGGED:
${yesterdayLogStr}

INSTRUCTIONS:
1. Be concise, clear, and encouraging — students are busy.
2. Reference their actual numbers when giving advice (e.g., "you still need Xg of protein").
3. Recommend specific foods or meal strategies from Clark University's Higgins dining hall when relevant.
4. Keep responses under 120 words unless a detailed explanation is truly needed.
5. Never diagnose medical conditions. For medical concerns, always refer to a healthcare professional.
6. Avoid using * or _ for emphasis; use plain text.`;
}

// ─── Gemini API Client ───────────────────────────────────────────────────────

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason: string;
  }>;
}

/**
 * Sends a chat message to the Gemini API and returns the assistant's reply.
 *
 * @param userMessage - The latest message from the user
 * @param context - Today's nutrition context for system prompt injection
 * @param history - Previous messages in the conversation (last 10)
 * @returns The assistant's text reply
 * @throws On API errors or missing API key
 */
export async function getAIResponse(
  userMessage: string,
  context: ChatContext,
  history: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[aiNutritionist] GEMINI_API_KEY environment variable is not set. " +
      "Get a free key at https://aistudio.google.com/apikey"
    );
  }

  // ── Build conversation history for Gemini ──
  // Gemini expects alternating user/model turns, starting with user
  const contents: GeminiContent[] = history
    .slice(-10) // Keep last 10 messages for context window
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

  // Append the current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const systemPrompt = buildSystemPrompt(context);

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 512,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post<GeminiResponse>(url, requestBody, {
      headers: { "Content-Type": "application/json" },
      timeout: 30_000,
    });

    const candidate = response.data.candidates?.[0];
    if (!candidate) throw new Error("[aiNutritionist] Empty response from Gemini API");

    const text = candidate.content.parts.map((p) => p.text).join("");
    if (!text) throw new Error("[aiNutritionist] No text in Gemini response");

    return text.trim();
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const data = axiosErr.response.data as { error?: { message?: string } };
      throw new Error(
        `[aiNutritionist] Gemini API error ${status}: ${data?.error?.message ?? axiosErr.message}`
      );
    }
    throw err;
  }
}
