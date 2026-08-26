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
import path from "path";
import { fileURLToPath } from "url";
import { menuRouter } from "./routes/menu.js";
import { aiRouter } from "./routes/ai.js";

// ─── Startup Environment Validation ───────────────────────────────────────────
// Fix #2: GEMINI_API_KEY absence is now a warning, not a fatal crash.
// The scraper and menu routes don't need the Gemini key. The AI route throws
// its own descriptive error when the key is missing at call time.

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "[server] WARNING: GEMINI_API_KEY is not set. " +
    "The /api/ai/chat endpoint will return errors until it is added to .env."
  );
}

const app = express();
const PORT = process.env.PORT ?? 3001;

// Fix #13: Default NODE_ENV to "development" when unset.
// The dev script (tsx watch) doesn't set NODE_ENV, which previously caused
// the production SPA catch-all to register and crash when dist/ doesn't exist.
const isDev = (process.env.NODE_ENV ?? "development") !== "production";

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS origin from env var. Falls back to localhost for local dev.
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

// ─── Serve Frontend in Production ─────────────────────────────────────────────
// Fix #13: Only register static serving when actually in production.
// Fix #15: SPA catch-all is registered BEFORE the error handler so errors
// thrown inside sendFile() are forwarded to the error handler correctly.
if (!isDev) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // In production, server runs from dist/server/index.js, client is in dist/
  const distPath = path.resolve(__dirname, "..");

  app.use(express.static(distPath));

  // SPA fallback: any route not matched by API or static files serves index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Fix #15: Registered LAST — after all routes and static serving.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log full error server-side for all failures
  console.error("[server] Unhandled error:", err.name, err.message);
  if (isDev) console.error(err.stack);

  const isScraperError =
    err.message.includes("[menuHoursScraper]") ||
    err.message.includes("[locationMenuScraper]");

  if (isScraperError) {
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
  console.log(`[server] Environment: ${isDev ? "development" : "production"}`);
  console.log(`[server] Try: http://localhost:${PORT}/api/menu?date=${new Date().toISOString().slice(0, 10)}`);
});

export { app };


