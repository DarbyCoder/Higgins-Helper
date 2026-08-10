/**
 * @file server/routes/ai.ts
 * @description Express router for the AI nutritionist chat endpoint.
 *
 * POST /api/ai/chat
 *   Body: { message: string, context: ChatContext, history: ChatMessage[] }
 *   Response: { reply: string }
 */

import { Router, Request, Response, NextFunction } from "express";
import { getAIResponse, type ChatContext, type ChatMessage } from "../services/aiNutritionist.js";

export const aiRouter = Router();

interface ChatRequestBody {
  message: string;
  context: ChatContext;
  history: ChatMessage[];
}

aiRouter.post(
  "/chat",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { message, context, history } = req.body as ChatRequestBody;

    // ── Validate ──
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "message is required and must be a non-empty string" });
      return;
    }
    if (!context || typeof context !== "object") {
      res.status(400).json({ error: "context is required" });
      return;
    }

    // Rate limiting note: In production, add a per-user rate limiter here
    // to prevent abuse of the Gemini API (e.g., express-rate-limit with
    // a Redis store keyed by student IP).

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
