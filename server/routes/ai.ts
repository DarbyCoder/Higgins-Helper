/**
 * @file server/routes/ai.ts
 * @description Express router for the AI nutritionist chat endpoint.
 *
 * POST /api/ai/chat
 *   Body: { message: string, context: ChatContext, history: ChatMessage[] }
 *   Response: { reply: string }
 */

import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { getAIResponse, type ChatContext, type ChatMessage } from "../services/aiNutritionist.js";

export const aiRouter = Router();

interface ChatRequestBody {
  message: string;
  context: ChatContext;
  history: ChatMessage[];
}

// ── Rate Limiter (#19) ────────────────────────────────────────────────────────
// Max 20 requests per 10 minutes per IP to prevent Gemini API abuse.
const chatRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes before trying again." },
});

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
  chatRateLimiter,
  validateChatRequest,
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

