/**
 * @file src/pages/AddFoodPage.tsx
 * @description Log food that isn't on the Higgins menu.
 *
 * Two modes:
 *  • Barcode Scan — reads the barcode from the camera or a photo in any
 *    browser (src/utils/barcodeScanner.ts), then looks it up on Open Food Facts.
 *  • Manual Entry — a form where you type in any nutritional values you know.
 *
 * Both modes flow into the same confirm step (meal slot + servings → add to log).
 *
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodLogStore, useDateStore, useUIStore } from "@/stores";
import type { MealSlot } from "@/types";
import { AlertIcon, BarcodeIcon, CameraIcon, CheckIcon, ChevronLeftIcon, PencilIcon } from "@/components/icons";
import { decodeImageFile, startLiveScan, type StopScan } from "@/utils/barcodeScanner";
import MacroTiles from "@/components/nutrition/MacroTiles";

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

/** What a barcode lookup found. */
type LookupResult =
  | { kind: "found"; food: FoodDraft }
  /** Product known, but without calories: fill the rest in by hand. */
  | { kind: "no-nutrition"; name: string }
  | { kind: "not-found" }
  | { kind: "offline" };

/**
 * Looks up a barcode on Open Food Facts. Uses per-serving numbers when the
 * product has them, otherwise per-100 g, never a mix of the two.
 */
async function lookupBarcode(barcode: string): Promise<LookupResult> {
  let data: OFFResponse;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,nutriments,serving_size`,
    );
    if (res.status === 404) return { kind: "not-found" };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json() as OFFResponse;
  } catch {
    return { kind: "offline" };
  }
  if (data.status !== 1 || !data.product) return { kind: "not-found" };

  const p = data.product;
  const n = p.nutriments ?? {};
  const name = p.product_name?.trim() || "";
  const perServing = n["energy-kcal_serving"] != null;
  if (!perServing && n["energy-kcal_100g"] == null) return { kind: "no-nutrition", name };

  const get = (key: string) =>
    Number((n as Record<string, number | undefined>)[`${key}_${perServing ? "serving" : "100g"}`] ?? 0);
  return {
    kind: "found",
    food: {
      name: name || `Product ${barcode}`,
      servingSize: perServing ? (p.serving_size || "1 serving") : "100 g",
      calories:   Math.round(get("energy-kcal")),
      protein:    Math.round(get("proteins") * 10) / 10,
      totalCarbs: Math.round(get("carbohydrates") * 10) / 10,
      totalFat:   Math.round(get("fat") * 10) / 10,
      fiber:      Math.round(get("fiber") * 10) / 10,
      sodium:     Math.round(get("sodium") * 1000), // OFF gives sodium in g
    },
  };
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
    // Build a synthetic MenuItem-like entry for addFoodEntry (#17)
    // We satisfy the required base fields so we don't need 'as any'
    const syntheticItem: import("@/types").MenuItem = {
      id: crypto.randomUUID(),
      name: draft.name,
      servingSize: draft.servingSize,
      calories: draft.calories,
      protein: draft.protein,
      totalCarbs: draft.totalCarbs,
      totalFat: draft.totalFat,
      fiber: draft.fiber,
      sodium: draft.sodium,
      attributes: [], allergensList: "",
      description: "", facts: [],
      ingredientsList: "",
      disclaimer: ""
    };
    addFoodEntry(selectedDate, mealSlot, syntheticItem, "Custom Entry", servings);
    setAdded(true);
    setTimeout(() => navigate("/log"), 1400);
  }

  return (
    <div className="page">
      {/* Back button, and the step's name once past the first (the header names the page) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ChevronLeftIcon size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: mode === "choose" ? "var(--color-text-2)" : "var(--color-text-1)" }}>
          {mode === "scan" ? "Scan Barcode"
            : mode === "manual" ? "Manual Entry"
            : mode === "confirm" ? "Confirm & Log"
            : "How do you want to add it?"}
        </h2>
      </div>

      {mode === "choose"  && <ChooseMode onScan={() => setMode("scan")} onManual={() => setMode("manual")} />}
      {mode === "scan"    && (
        <ScanMode
          onFound={goToConfirm}
          onManual={(name = "") => { setDraft({ ...EMPTY_DRAFT, name }); setMode("manual"); }}
        />
      )}
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Barcode option */}
      <button onClick={onScan} className="pressable" style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "1.1rem 1.1rem",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.18s",
      }}>
        <div aria-hidden="true" style={{
          width: 48, height: 48, borderRadius: "var(--radius-md)", flexShrink: 0,
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff",
        }}><BarcodeIcon size={24} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-1)" }}>
            Scan Barcode
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>
            Point your camera at the barcode and the nutrition fills in from Open Food Facts
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth={2} strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg>
      </button>

      <button onClick={onManual} className="pressable" style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "1.1rem 1.1rem",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.18s",
      }}>
        <div aria-hidden="true" style={{
          width: 48, height: 48, borderRadius: "var(--radius-md)", flexShrink: 0,
          background: "var(--color-surface-3)", border: "1px solid var(--color-border-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-1)",
        }}><PencilIcon size={22} /></div>
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


    </div>
  );
}

// ─── Mode: Scan ───────────────────────────────────────────────────────────────

type ScanStatus = "starting" | "scanning" | "looking-up" | "no-camera";

/**
 * Live camera scanning, with "use a photo" for when the camera can't open
 * or the barcode won't read live. A code is looked up on Open Food Facts:
 * found → confirm; known but no nutrition, or unknown → manual entry.
 */
function ScanMode({ onFound, onManual }: { onFound(f: FoodDraft): void; onManual(name?: string): void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef  = useRef<StopScan | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ScanStatus>("starting");
  const [cameraError, setCameraError] = useState("");

  // Latest callbacks, so the camera isn't restarted when the page re-renders
  const handlers = useRef({ onFound, onManual });
  handlers.current = { onFound, onManual };

  const handleCode = useCallback(async (code: string) => {
    stopRef.current?.();
    setStatus("looking-up");
    try { navigator.vibrate?.(40); } catch { /* not supported */ }
    const toast = useUIStore.getState().showToast;
    const result = await lookupBarcode(code);
    if (result.kind === "found") {
      handlers.current.onFound(result.food);
    } else if (result.kind === "no-nutrition") {
      toast(`${result.name || "This product"} has no nutrition info online. Enter it from the label.`, "info");
      handlers.current.onManual(result.name);
    } else if (result.kind === "not-found") {
      toast(`Barcode ${code} isn't in the product database. Enter it from the label.`, "info");
      handlers.current.onManual();
    } else {
      toast("Couldn't reach the product database. Check your connection, or enter it by hand.", "error");
      handlers.current.onManual();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stop = await startLiveScan(videoRef.current!, handleCode);
        if (cancelled) { stop(); return; }
        stopRef.current = stop;
        setStatus((s) => (s === "starting" ? "scanning" : s));
      } catch (e) {
        if (cancelled) return;
        setStatus("no-camera");
        const name = e instanceof DOMException ? e.name : "";
        setCameraError(
          name === "NotAllowedError" ? "Camera access is off for Higgins Helper. Allow it in your settings, or use a photo."
          : name === "NotFoundError" ? "No camera found. Use a photo of the barcode instead."
          : "The camera couldn't start. Use a photo of the barcode instead.",
        );
      }
    })();
    return () => { cancelled = true; stopRef.current?.(); };
  }, [handleCode]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same photo can be picked again
    if (!file) return;
    stopRef.current?.();
    setStatus("looking-up");
    const code = await decodeImageFile(file);
    if (code) return handleCode(code);
    useUIStore.getState().showToast("Couldn't find a barcode in that photo. Try closer, flat and in focus.", "error");
    setStatus("no-camera");
    setCameraError("No barcode found in that photo. Try another, or enter it by hand.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Viewfinder */}
      <div style={{
        position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden",
        background: "#000", aspectRatio: "4/3",
      }}>
        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

        {status === "scanning" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              position: "relative", width: "72%", aspectRatio: "2/1",
              border: "2px solid rgba(44,197,165,0.9)", borderRadius: "var(--radius-md)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            }}>
              <div style={{
                position: "absolute", top: "50%", left: "5%", right: "5%", height: 2,
                background: "linear-gradient(90deg, transparent, var(--color-primary-light), transparent)",
                animation: "scanLine 1.5s ease-in-out infinite",
              }} />
            </div>
          </div>
        )}
        {status === "starting" && (
          <Overlay><p style={{ color: "#fff", fontSize: "0.85rem", margin: 0 }}>Opening the camera…</p></Overlay>
        )}
        {status === "looking-up" && (
          <Overlay tint="rgba(10,92,78,0.92)">
            <CheckIcon size={36} strokeWidth={2.4} style={{ color: "#fff" }} />
            <p style={{ color: "#fff", fontWeight: 600, margin: 0 }}>Looking up nutrition…</p>
          </Overlay>
        )}
        {status === "no-camera" && (
          <Overlay tint="rgba(0,0,0,0.82)">
            <AlertIcon size={30} style={{ color: "#f87171" }} />
            <p style={{ color: "#f2f2f8", margin: 0, fontSize: "0.85rem", lineHeight: 1.5, maxWidth: 280 }}>{cameraError}</p>
          </Overlay>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-20px); opacity: 0.5; }
          50%  { transform: translateY(20px);  opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0.5; }
        }
      `}</style>

      {status === "scanning" && (
        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--color-text-3)", margin: 0 }}>
          Hold the barcode inside the frame, about a hand's length away
        </p>
      )}

      <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
      <button
        className={status === "no-camera" ? "btn-primary" : "btn-ghost"}
        onClick={() => photoRef.current?.click()}
        disabled={status === "looking-up"}
        style={{ width: "100%", justifyContent: "center", gap: "0.45rem" }}
      >
        <CameraIcon size={17} />
        Use a photo of the barcode
      </button>
      <button className="btn-ghost" onClick={() => onManual()} style={{ width: "100%", justifyContent: "center" }}>
        Enter manually instead
      </button>
    </div>
  );
}

function Overlay({ children, tint = "transparent" }: { children: React.ReactNode; tint?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: tint, padding: "1rem", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    }}>
      {children}
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
          <Field label="Calories (cal) *">
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

        <div style={{ marginTop: "0.85rem" }}>
          <MacroTiles calories={scaled.calories} protein={scaled.protein} carbs={scaled.totalCarbs} fat={scaled.totalFat} />
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
        {added ? "Added! Redirecting…" : `Add ${Math.round(scaled.calories)} cal to ${MEAL_SLOTS.find((m) => m.value === mealSlot)?.label ?? mealSlot}`}
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

