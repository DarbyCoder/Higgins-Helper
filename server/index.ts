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

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: "http://localhost:5173" })); // Vite dev server
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/menu", menuRouter);
app.use("/api/ai", aiRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Higgins Helper API running at http://localhost:${PORT}`);
  console.log(`[server] Try: http://localhost:${PORT}/api/menu?date=${new Date().toISOString().slice(0, 10)}`);
});

export { app };
