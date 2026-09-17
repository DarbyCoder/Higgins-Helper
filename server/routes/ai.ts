/**
 * @file server/routes/ai.ts
 * @description Express router for the AI nutritionist chat endpoint.
 *
 * POST /api/ai/chat
 *   Body: { message: string, context: ChatContext, history: ChatMessage[] }
 *   Headers: X-Device-Id (client-generated UUID; falls back to IP if absent)
 *   Response: { reply: string }
 *   Limits: 5 questions/day per device (resets midnight ET, in-memory) plus a
 *   1-request/5s burst guard per IP. 429 with { error } when exceeded.
 *
 * POST /api/ai/recommend-blurb
 *   Body: { date: "YYYY-MM-DD", mealPeriod: string, items: BlurbItem[], remaining: {...} }
 *   Response: { blurb: string }  — 503 when GEMINI_API_KEY is unset
 */

import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import {
  getAIResponse,
  getRecommendationBlurb,
  isGeminiConfigured,
  type BlurbRequest,
  type ChatContext,
  type ChatMessage,
} from "../services/aiNutritionist.js";
import { getLocalDateString } from "./menu.js";

export const aiRouter = Router();

interface ChatRequestBody {
  message: string;
  context: ChatContext;
  history: ChatMessage[];
}

// ── Burst Guard (#19) ─────────────────────────────────────────────────────────
// Stops double-submits and scripted hammering; the daily limit below is the
// real usage cap.
const chatBurstLimiter = rateLimit({
  windowMs: 5_000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please wait a few seconds before sending another question." },
});

// ── Daily Question Limit ──────────────────────────────────────────────────────
// 5 questions per device per day (America/New_York). Keyed on the client's
// X-Device-Id header since the server has no auth; falls back to IP. In-memory,
// so counts reset on redeploy. Counts every request that reaches Gemini,
// regardless of whether the call succeeds.
const DAILY_QUESTION_LIMIT = 5;
const DEVICE_ID_MAX_LENGTH = 128;
const dailyQuestionCounts = new Map<string, { count: number; day: string }>();

setInterval(() => {
  const today = getLocalDateString();
  for (const [key, entry] of dailyQuestionCounts) {
    if (entry.day !== today) dailyQuestionCounts.delete(key);
  }
}, 60 * 60 * 1000).unref();

function dailyQuestionLimiter(req: Request, res: Response, next: NextFunction): void {
  const deviceId = req.get("X-Device-Id")?.trim();
  const key =
    deviceId && deviceId.length <= DEVICE_ID_MAX_LENGTH
      ? `device:${deviceId}`
      : `ip:${req.ip ?? "unknown"}`;

  const today = getLocalDateString();
  let entry = dailyQuestionCounts.get(key);
  if (!entry || entry.day !== today) {
    entry = { count: 0, day: today };
    dailyQuestionCounts.set(key, entry);
  }

  if (entry.count >= DAILY_QUESTION_LIMIT) {
    res.status(429).json({
      error: `You've hit today's limit of ${DAILY_QUESTION_LIMIT} AI Nutritionist questions. Try again after midnight ET.`,
    });
    return;
  }

  entry.count++;
  next();
}

// ── Type guard helpers ────────────────────────────────────────────────────────

/** Returns true only for plain objects (not null, not arrays). */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Validates that context has the required numeric dailyTotals fields. */
function isValidContext(v: unknown): v is ChatContext {
  if (!isPlainObject(v)) return false;
  const totals = v["dailyTotals"];
  if (!isPlainObject(totals)) return false;
  const required = ["calories", "protein", "totalFat", "totalCarbs", "sodium", "fiber"];
  return required.every((k) => typeof totals[k] === "number");
}

/** Validates that history is an array of well-formed ChatMessage objects. */
function isValidHistory(v: unknown): v is ChatMessage[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (msg) =>
      isPlainObject(msg) &&
      (msg["role"] === "user" || msg["role"] === "assistant") &&
      typeof msg["content"] === "string"
  );
}

// ─── Middleware (#16) ─────────────────────────────────────────────────────────

function validateChatRequest(req: Request, res: Response, next: NextFunction): void {
  const { message, context, history } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required and must be a non-empty string" });
    return;
  }
  if (!isValidContext(context)) {
    res.status(400).json({
      error: "context is required and must include a dailyTotals object with numeric macro fields",
    });
    return;
  }
  if (history !== undefined && !isValidHistory(history)) {
    res.status(400).json({
      error: "history must be an array of { role: 'user'|'assistant', content: string } objects",
    });
    return;
  }

  next();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

aiRouter.post(
  "/chat",
  chatBurstLimiter,
  validateChatRequest,
  dailyQuestionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { message, context, history } = req.body as ChatRequestBody;

    try {
      const reply = await getAIResponse(
        message.trim(),
        context,
        Array.isArray(history) ? history : []
      );
      res.json({ reply });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Recommendation Blurb ─────────────────────────────────────────────────────

// Called automatically on dashboard load (not user-triggered), so the limit is
// looser than chat's. Clients also cache per day, so real traffic is low.
const blurbRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." },
});

/**
 * Per-day blurb cache keyed by date + request signature (meal, item macros,
 * remaining budget). Identical shortlists on the same day reuse one Gemini call.
 */
const BLURB_TTL_MS = 24 * 60 * 60 * 1000;
const BLURB_CACHE_MAX = 500;
const blurbCache = new Map<string, { blurb: string; cachedAt: number }>();
const blurbInflight = new Map<string, Promise<string>>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of blurbCache) {
    if (now - entry.cachedAt > BLURB_TTL_MS) blurbCache.delete(key);
  }
}, 60 * 60 * 1000).unref();

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseBlurbRequest(body: unknown): (BlurbRequest & { date: string }) | null {
  if (!isPlainObject(body)) return null;
  const { date, mealPeriod, items, remaining } = body;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof mealPeriod !== "string" || !mealPeriod.trim() || mealPeriod.length > 60) return null;
  if (!Array.isArray(items) || items.length === 0 || items.length > 5) return null;
  if (!isPlainObject(remaining)) return null;

  const macroKeys = ["calories", "protein", "totalCarbs", "totalFat", "sodium", "fiber"] as const;
  const cleanItems: BlurbRequest["items"] = [];
  for (const item of items) {
    if (!isPlainObject(item)) return null;
    if (typeof item["name"] !== "string" || !item["name"].trim() || item["name"].length > 120) return null;
    if (!macroKeys.every((k) => isFiniteNumber(item[k]))) return null;
    cleanItems.push({
      name: item["name"].trim(),
      calories: item["calories"] as number,
      protein: item["protein"] as number,
      totalCarbs: item["totalCarbs"] as number,
      totalFat: item["totalFat"] as number,
      sodium: item["sodium"] as number,
      fiber: item["fiber"] as number,
    });
  }

  const remainingKeys = ["calories", "protein", "sodium", "fiber"] as const;
  if (!remainingKeys.every((k) => isFiniteNumber(remaining[k]))) return null;

  return {
    date,
    mealPeriod: mealPeriod.trim(),
    items: cleanItems,
    remaining: {
      calories: remaining["calories"] as number,
      protein: remaining["protein"] as number,
      sodium: remaining["sodium"] as number,
      fiber: remaining["fiber"] as number,
    },
  };
}

aiRouter.post(
  "/recommend-blurb",
  blurbRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = parseBlurbRequest(req.body);
    if (!parsed) {
      res.status(400).json({ error: "Invalid recommend-blurb request body" });
      return;
    }

    // Soft failure: the client just omits the blurb
    if (!isGeminiConfigured()) {
      res.status(503).json({ error: "AI blurb unavailable" });
      return;
    }

    const { date, ...blurbReq } = parsed;
    const key = `${date}|${JSON.stringify(blurbReq)}`;

    const cached = blurbCache.get(key);
    if (cached && Date.now() - cached.cachedAt <= BLURB_TTL_MS) {
      res.json({ blurb: cached.blurb });
      return;
    }

    try {
      let pending = blurbInflight.get(key);
      if (!pending) {
        pending = getRecommendationBlurb(blurbReq).finally(() => blurbInflight.delete(key));
        blurbInflight.set(key, pending);
      }
      const blurb = await pending;

      if (blurbCache.size >= BLURB_CACHE_MAX) {
        // Evict the oldest entry (Map preserves insertion order)
        const oldest = blurbCache.keys().next().value;
        if (oldest !== undefined) blurbCache.delete(oldest);
      }
      blurbCache.set(key, { blurb, cachedAt: Date.now() });
      res.json({ blurb });
    } catch (err) {
      // Non-critical feature: log and return a soft error rather than a 500 stack
      console.warn("[ai] recommend-blurb failed:", err instanceof Error ? err.message : err);
      res.status(502).json({ error: "AI blurb unavailable" });
    }
  }
);
