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
import { menuRouter, getScrapePromise, getLocalDateString } from "./routes/menu.js";
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
  console.log(`[server] Try: http://localhost:${PORT}/api/menu?date=${getLocalDateString()}`);

  // ─── Startup Cache Pre-Warming ──────────────────────────────────────────────
  // Trigger a background scrape of today's menu immediately after the server
  // starts. By the time the first user navigates to the Menu tab, the cache is
  // already warm → instant response instead of a 10-second cold scrape.
  //
  // setImmediate defers until after the listen() callback returns so the server
  // is fully ready before we fire the first network request.
  setImmediate(() => {
    const today = getLocalDateString();
    console.log(`[server] Pre-warming cache for ${today}…`);
    getScrapePromise(today)
      .then(() => console.log(`[server] Cache pre-warm complete for ${today}`))
      .catch((err) => console.warn(`[server] Cache pre-warm failed (non-fatal):`, err?.message ?? err));
  });

  // ─── Daily 6am ET Re-Warm ───────────────────────────────────────────────────
  // Clark Dining refreshes its menu overnight. Re-warm at 6am ET so the first
  // student to check the menu each morning gets instant data.
  scheduleDaily6amReWarm();
});

/**
 * Schedules a one-shot timer that fires at the next 6:00 AM Eastern Time,
 * warms the cache for that day, then re-schedules itself for the next 6am.
 * This keeps the cache hot through the dining day without any external cron job.
 */
function scheduleDaily6amReWarm(): void {
  const now = new Date();

  // Compute next 6am ET
  const next6amET = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now).replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2") + "T06:00:00-05:00"
  );
  // If 6am today has already passed, advance to tomorrow
  if (next6amET <= now) next6amET.setDate(next6amET.getDate() + 1);

  const msUntil = next6amET.getTime() - now.getTime();
  console.log(
    `[server] Daily re-warm scheduled for ${next6amET.toLocaleString("en-US", { timeZone: "America/New_York" })} ET ` +
    `(in ${Math.round(msUntil / 1000 / 60)} min)`
  );

  setTimeout(() => {
    const today = getLocalDateString();
    console.log(`[server] Daily re-warm: pre-warming cache for ${today}`);
    getScrapePromise(today)
      .then(() => console.log(`[server] Daily re-warm complete for ${today}`))
      .catch((err) => console.warn(`[server] Daily re-warm failed (non-fatal):`, err?.message ?? err));

    // Re-schedule for tomorrow's 6am
    scheduleDaily6amReWarm();
  }, msUntil).unref(); // unref() so the timer doesn't keep Node alive if the server shuts down
}

export { app };


