/**
 * @file server/index.ts
 * @description Express server entry point for local development.
 * In production, each route is deployed as a Firebase Cloud Function.
 *
 * Environment variables are loaded from .env (root) by dotenv.
 * Add GEMINI_API_KEY=your_key to a .env file at the project root.
 */

// Load .env FIRST — before any other imports read process.env
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { menuRouter } from "./routes/menu.js";
import { aiRouter } from "./routes/ai.js";

// ─── Startup Environment Validation (#21) ─────────────────────────────────────
// Fail fast so missing keys are caught at boot, not mid-request.

const REQUIRED_ENV_VARS = ["GEMINI_API_KEY"] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`[server] FATAL: Required environment variable "${key}" is not set.`);
    console.error(`[server] Add it to your .env file and restart the server.`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS origin from env var (#20). Falls back to localhost for local dev.
// In production, set CORS_ORIGIN=https://your-deployed-domain.com in env.
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/menu", menuRouter);
app.use("/api/ai", aiRouter);

// ─── Global Error Handler (#5) ────────────────────────────────────────────────
// Discriminates between scraper errors and generic server errors.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV === "development";

  // Log full error server-side for all failures
  console.error("[server] Unhandled error:", err.name, err.message);
  if (isDev) console.error(err.stack);

  const isScraperError =
    err.message.includes("[menuHoursScraper]") ||
    err.message.includes("[locationMenuScraper]");

  if (isScraperError) {
    // Return a structured response so the client can show a useful message
    res.status(502).json({
      error: "Menu data temporarily unavailable",
      message: isDev
        ? err.message
        : "Could not fetch menu data from the dining site. Please try again later.",
    });
    return;
  }

  res.status(500).json({
    error: "Internal server error",
    message: isDev ? err.message : "Something went wrong",
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Higgins Helper API running at http://localhost:${PORT}`);
  console.log(`[server] CORS origin: ${CORS_ORIGIN}`);
  console.log(`[server] Try: http://localhost:${PORT}/api/menu?date=${new Date().toISOString().slice(0, 10)}`);
});

export { app };

