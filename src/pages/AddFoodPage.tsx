/**
 * @file src/pages/AddFoodPage.tsx
 * @description Log food that isn't on the Higgins menu.
 *
 * Two modes:
 *  • Barcode Scan — uses the BarcodeDetector API (Chrome/Edge/Safari 17+)
 *    with a camera video feed, then looks up the UPC on Open Food Facts.
 *  • Manual Entry — a form where you type in any nutritional values you know.
 *
 * Both modes flow into the same confirm step (meal slot + servings → add to log).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodLogStore, useDateStore } from "@/stores";
import type { MealSlot } from "@/types";

// ─── Type stubs for BarcodeDetector (experimental API) ──────────────────────
interface DetectedBarcode { rawValue: string; format: string; }
interface BarcodeDetectorInstance {
  detect(image: HTMLVideoElement | ImageBitmap): Promise<DetectedBarcode[]>;
}
declare const BarcodeDetector: {
  new(opts: { formats: string[] }): BarcodeDetectorInstance;
};

// ─── Open Food Facts API ──────────────────────────────────────────────────────
interface OFFNutriments {
  "energy-kcal_serving"?: number;
  "energy-kcal_100g"?: number;
  proteins_serving?: number;
  proteins_100g?: number;
  carbohydrates_serving?: number;
  carbohydrates_100g?: number;
  fat_serving?: number;
  fat_100g?: number;
  fiber_serving?: number;
  fiber_100g?: number;
  sodium_serving?: number;
  sodium_100g?: number;
}

interface OFFProduct {
  product_name: string;
  serving_size?: string;
  nutriments: OFFNutriments;
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

/** Grab nutriment value, preferring _serving, falling back to _100g. */
function off(n: OFFNutriments, key: string): number {
  const serv = (n as Record<string, number | undefined>)[`${key}_serving`];
  const per100 = (n as Record<string, number | undefined>)[`${key}_100g`];
  return serv ?? per100 ?? 0;
}

async function lookupBarcode(barcode: string): Promise<FoodDraft | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments,serving_size`,
      { headers: { "User-Agent": "HigginsHelper/1.0 (nicke@clarku.edu)" } }
    );
    const data: OFFResponse = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments;
    return {
      name: p.product_name || `Product ${barcode}`,
      servingSize: p.serving_size ?? "1 serving",
      calories:   Math.round(off(n, "energy-kcal")),
      protein:    Math.round(off(n, "proteins") * 10) / 10,
      totalCarbs: Math.round(off(n, "carbohydrates") * 10) / 10,
      totalFat:   Math.round(off(n, "fat") * 10) / 10,
      fiber:      Math.round(off(n, "fiber") * 10) / 10,
      sodium:     Math.round(off(n, "sodium") * 1000), // OFF gives sodium in g
    };
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FoodDraft {
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
  totalCarbs: number;
  totalFat: number;
  fiber: number;
  sodium: number;
}

const EMPTY_DRAFT: FoodDraft = {
  name: "", servingSize: "1 serving",
  calories: 0, protein: 0, totalCarbs: 0, totalFat: 0, fiber: 0, sodium: 0,
};

type Mode = "choose" | "scan" | "manual" | "confirm";

const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch" },
  { value: "dinner",    label: "Dinner" },
  { value: "snack",     label: "Snack" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddFoodPage() {
  const navigate = useNavigate();
  const { selectedDate } = useDateStore();
  const { addFoodEntry }  = useFoodLogStore();

  const [mode, setMode]         = useState<Mode>("choose");
  const [draft, setDraft]       = useState<FoodDraft>(EMPTY_DRAFT);
  const [mealSlot, setMealSlot] = useState<MealSlot>("lunch");
  const [servings, setServings] = useState(1);
  const [added, setAdded]       = useState(false);

  function goToConfirm(food: FoodDraft) {
    setDraft(food);
    setMode("confirm");
  }

  function handleAdd() {
    // Build a synthetic MenuItem-like entry for addFoodEntry
    const syntheticItem = {
      id: crypto.randomUUID(),
      name: draft.name,
      servingSize: draft.servingSize,
      calories: draft.calories,
      protein: draft.protein,
      totalCarbs: draft.totalCarbs,
      totalFat: draft.totalFat,
      fiber: draft.fiber,
      sodium: draft.sodium,
      saturatedFat: 0, transFat: 0, polyFat: 0, monoFat: 0,
      cholesterol: 0, sugar: 0, addedSugar: 0,
      attributes: [], allergensList: "",
      description: "", facts: [],
    } as any;
    addFoodEntry(selectedDate, mealSlot, syntheticItem, "Custom Entry", servings);
    setAdded(true);
    setTimeout(() => navigate("/log"), 1400);
  }

  return (
    <div className="page">
      {/* Back header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
          {mode === "scan" ? "Scan Barcode"
            : mode === "manual" ? "Manual Entry"
            : mode === "confirm" ? "Confirm & Log"
            : "Add Custom Food"}
        </h1>
      </div>

      {mode === "choose"  && <ChooseMode onScan={() => setMode("scan")} onManual={() => setMode("manual")} />}
      {mode === "scan"    && <ScanMode onFound={goToConfirm} onFallback={() => setMode("manual")} />}
      {mode === "manual"  && <ManualMode draft={draft} onChange={setDraft} onConfirm={() => goToConfirm(draft)} />}
      {mode === "confirm" && (
        <ConfirmMode
          draft={draft}
          servings={servings}
          setServings={setServings}
          mealSlot={mealSlot}
          setMealSlot={setMealSlot}
          onAdd={handleAdd}
          added={added}
        />
      )}
    </div>
  );
}

// ─── Mode: Choose ─────────────────────────────────────────────────────────────

function ChooseMode({ onScan, onManual }: { onScan(): void; onManual(): void }) {
  const hasBarcodeDetector = "BarcodeDetector" in window;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Barcode option */}
      <button onClick={onScan} style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "1.1rem 1.1rem",
        background: hasBarcodeDetector ? "var(--color-surface-2)" : "var(--color-surface-3)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.18s",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "var(--radius-md)", flexShrink: 0,
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem",
        }}>📷</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-1)" }}>
            Scan Barcode
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>
            {hasBarcodeDetector
              ? "Point camera at a barcode — autofills nutrition from Open Food Facts"
              : "Upload a barcode photo to identify the product"}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth={2} strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg>
      </button>

      {/* Manual option */}
      <button onClick={onManual} style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "1.1rem 1.1rem",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.18s",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "var(--radius-md)", flexShrink: 0,
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem",
        }}>✏️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-1)" }}>
            Manual Entry
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>
            Type in name, calories, protein, carbs, fat from any label
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth={2} strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg>
      </button>

      {!hasBarcodeDetector && (
        <p style={{ fontSize: "0.72rem", color: "var(--color-text-3)", textAlign: "center", margin: "0.25rem 0 0" }}>
          Live camera scanning requires Chrome or Edge. Safari 17+ also supported.
        </p>
      )}
    </div>
  );
}

// ─── Mode: Scan ───────────────────────────────────────────────────────────────

function ScanMode({ onFound, onFallback }: { onFound(f: FoodDraft): void; onFallback(): void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);

  const [status, setStatus]   = useState<"requesting" | "scanning" | "found" | "error">("requesting");
  const [errMsg, setErrMsg]   = useState("");
  const [lookingUp, setLooking] = useState(false);

  const hasBarcodeDetector = "BarcodeDetector" in window;

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!hasBarcodeDetector) return;

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");

        const detector = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
        });

        async function tick() {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0]) {
              const raw = codes[0].rawValue;
              setStatus("found");
              setLooking(true);
              stopStream();
              const food = await lookupBarcode(raw);
              setLooking(false);
              if (food) {
                onFound(food);
              } else {
                // Product not in database — fall back with barcode as name
                onFound({ ...EMPTY_DRAFT, name: `Product ${raw}`, servingSize: "1 serving" });
              }
              return;
            }
          } catch { /* detector not ready yet */ }
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(e instanceof Error ? e.message : "Camera access denied");
        }
      }
    }

    start();
    return () => { cancelled = true; stopStream(); };
  }, [hasBarcodeDetector, onFound, stopStream]);

  // ── File-input fallback (for browsers without BarcodeDetector) ──
  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLooking(true);
    setStatus("found");
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const codes = await detector.detect(bitmap);
      if (codes[0]) {
        const food = await lookupBarcode(codes[0].rawValue);
        setLooking(false);
        if (food) { onFound(food); return; }
      }
    } catch { /* fall through */ }
    setLooking(false);
    // Couldn't read — drop to manual
    onFallback();
  }

  if (!hasBarcodeDetector) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", paddingTop: "1rem" }}>
        <div style={{ fontSize: "3rem" }}>📸</div>
        <p style={{ textAlign: "center", color: "var(--color-text-2)", fontSize: "0.85rem" }}>
          Your browser doesn't support live scanning.<br />
          Upload a photo of the barcode instead.
        </p>
        <label className="btn-primary" style={{ cursor: "pointer" }}>
          <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: "none" }} />
          Upload Barcode Photo
        </label>
        <button className="btn-ghost" onClick={onFallback}>Enter Manually Instead</button>
        {lookingUp && <p style={{ color: "var(--color-text-3)", fontSize: "0.8rem" }}>Looking up product…</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Video viewfinder */}
      <div style={{
        position: "relative",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "#000",
        aspectRatio: "4/3",
      }}>
        <video
          ref={videoRef}
          muted playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Scan overlay */}
        {status === "scanning" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "65%", aspectRatio: "2/1",
              border: "2px solid rgba(196,30,58,0.9)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            }}>
              {/* Animated scan line */}
              <div style={{
                position: "absolute",
                top: "50%", left: "5%", right: "5%",
                height: 2,
                background: "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
                animation: "scanLine 1.5s ease-in-out infinite",
              }} />
            </div>
          </div>
        )}
        {(status === "found" || lookingUp) && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}>
            <div style={{ fontSize: "2rem" }}>✅</div>
            <p style={{ color: "#fff", fontWeight: 600, margin: 0 }}>
              {lookingUp ? "Looking up nutrition…" : "Barcode found!"}
            </p>
          </div>
        )}
        {status === "error" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "0.5rem", padding: "1rem", textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem" }}>⚠️</div>
            <p style={{ color: "#f87171", margin: 0, fontSize: "0.85rem" }}>{errMsg}</p>
          </div>
        )}
        {status === "requesting" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <p style={{ color: "#fff", fontSize: "0.85rem" }}>Requesting camera…</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-20px); opacity: 0.5; }
          50%  { transform: translateY(20px);  opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0.5; }
        }
      `}</style>

      <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--color-text-3)", margin: 0 }}>
        Point the camera at any packaged food barcode
      </p>
      <button className="btn-ghost" onClick={onFallback} style={{ width: "100%", justifyContent: "center" }}>
        Enter Manually Instead
      </button>
    </div>
  );
}

// ─── Mode: Manual ─────────────────────────────────────────────────────────────

function ManualMode({ draft, onChange, onConfirm }: {
  draft: FoodDraft;
  onChange: (d: FoodDraft) => void;
  onConfirm: () => void;
}) {
  function num(key: keyof FoodDraft) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...draft, [key]: Number(e.target.value) || 0 });
    };
  }
  function str(key: keyof FoodDraft) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...draft, [key]: e.target.value });
    };
  }

  const isValid = draft.name.trim().length > 0 && draft.calories > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div className="glass" style={{ padding: "1rem" }}>
        <div className="section-title">Food Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <Field label="Name *">
            <input className="input" placeholder="e.g. Greek Yogurt" value={draft.name} onChange={str("name")} />
          </Field>
          <Field label="Serving Size">
            <input className="input" placeholder="e.g. 1 cup (150g)" value={draft.servingSize} onChange={str("servingSize")} />
          </Field>
        </div>
      </div>

      <div className="glass" style={{ padding: "1rem" }}>
        <div className="section-title">Nutrition Per Serving</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          <Field label="Calories (kcal) *">
            <input className="input" type="number" min={0} placeholder="0" value={draft.calories || ""} onChange={num("calories")} />
          </Field>
          <Field label="Protein (g)">
            <input className="input" type="number" min={0} step={0.1} placeholder="0" value={draft.protein || ""} onChange={num("protein")} />
          </Field>
          <Field label="Carbs (g)">
            <input className="input" type="number" min={0} step={0.1} placeholder="0" value={draft.totalCarbs || ""} onChange={num("totalCarbs")} />
          </Field>
          <Field label="Fat (g)">
            <input className="input" type="number" min={0} step={0.1} placeholder="0" value={draft.totalFat || ""} onChange={num("totalFat")} />
          </Field>
          <Field label="Fiber (g)">
            <input className="input" type="number" min={0} step={0.1} placeholder="0" value={draft.fiber || ""} onChange={num("fiber")} />
          </Field>
          <Field label="Sodium (mg)">
            <input className="input" type="number" min={0} placeholder="0" value={draft.sodium || ""} onChange={num("sodium")} />
          </Field>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={onConfirm}
        disabled={!isValid}
        style={{ width: "100%", justifyContent: "center", padding: "0.9rem", opacity: isValid ? 1 : 0.45 }}
      >
        Continue →
      </button>
    </div>
  );
}

// ─── Mode: Confirm ───────────────────────────────────────────────────────────

function ConfirmMode({ draft, servings, setServings, mealSlot, setMealSlot, onAdd, added }: {
  draft: FoodDraft;
  servings: number;
  setServings: (n: number) => void;
  mealSlot: MealSlot;
  setMealSlot: (m: MealSlot) => void;
  onAdd: () => void;
  added: boolean;
}) {
  const scaled = {
    calories:   Math.round(draft.calories   * servings),
    protein:    Math.round(draft.protein    * servings * 10) / 10,
    totalCarbs: Math.round(draft.totalCarbs * servings * 10) / 10,
    totalFat:   Math.round(draft.totalFat   * servings * 10) / 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Food card */}
      <div className="glass" style={{ padding: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-1)", marginBottom: "0.25rem" }}>{draft.name}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{draft.servingSize}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginTop: "0.85rem" }}>
          {([
            { label: "Cal",     val: scaled.calories,   color: "#c41e3a" },
            { label: "Protein", val: `${scaled.protein}g`,  color: "#10b981" },
            { label: "Carbs",   val: `${scaled.totalCarbs}g`, color: "#3b82f6" },
            { label: "Fat",     val: `${scaled.totalFat}g`,  color: "#f59e0b" },
          ] as const).map(({ label, val, color }) => (
            <div key={label} style={{
              textAlign: "center", padding: "0.5rem 0.25rem",
              background: `${color}18`, borderRadius: "var(--radius-sm)",
              border: `1px solid ${color}33`,
            }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Servings + meal slot */}
      <div className="glass" style={{ padding: "1rem" }}>
        <div className="section-title">Add to Log</div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Servings counter */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            background: "var(--color-surface-3)", borderRadius: "var(--radius-full)",
            padding: "0.2rem 0.5rem", border: "1px solid var(--color-border)",
            flexShrink: 0,
          }}>
            <button onClick={() => setServings(Math.max(0.5, servings - 0.5))} style={{ background: "none", border: "none", color: "var(--color-text-1)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: "0 0.2rem" }}>−</button>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, minWidth: 28, textAlign: "center" }}>{servings}</span>
            <button onClick={() => setServings(servings + 0.5)} style={{ background: "none", border: "none", color: "var(--color-text-1)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: "0 0.2rem" }}>+</button>
          </div>
          <select className="select" value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)} style={{ flex: 1 }}>
            {MEAL_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={onAdd} style={{ width: "100%", justifyContent: "center", padding: "0.9rem" }}>
        {added ? "✓ Added! Redirecting…" : `Add ${scaled.calories} kcal to ${mealSlot}`}
      </button>
    </div>
  );
}

// ─── Shared helper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-3)", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}
