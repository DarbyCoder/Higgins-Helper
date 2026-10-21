/**
 * @file src/pages/ScanOrderPage.tsx
 * @description Log a Bistro order from a screenshot of Grubhub's "Your pickup
 * order", "Review your pickup order" or "View order" screen.
 *
 * The screenshot is read on the device with Tesseract OCR (its engine and
 * English data load from the jsDelivr CDN the first time), so the image —
 * which shows the student's name and phone number — never leaves the phone.
 * Each dish's components are matched to that day's Bistro menu and shown for
 * review before anything is added to the log.
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDateStore, useFoodLogStore, useMenuStore, useUIStore } from "@/stores";
import type { MealSlot } from "@/types";
import {
  bistroItems,
  dishToMenuItem,
  matchBistroOrder,
  parseBistroOrder,
  type MatchedDish,
} from "@/utils/bistroOrder";

const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch" },
  { value: "dinner",    label: "Dinner" },
  { value: "snack",     label: "Snack" },
];

function mealSlotForNow(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

type Phase =
  | { name: "pick" }
  | { name: "reading"; progress: number }
  | { name: "review"; dishes: MatchedDish[]; menuFound: boolean }
  | { name: "error"; message: string };

/** Reads the screenshot's text. The OCR library is only downloaded when used. */
async function readScreenshot(file: File, onProgress: (p: number) => void): Promise<string> {
  const { default: Tesseract } = await import("tesseract.js");
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  return data.text;
}

export default function ScanOrderPage() {
  const navigate = useNavigate();
  const { selectedDate } = useDateStore();
  const { addFoodEntry } = useFoodLogStore();
  const { showToast } = useUIStore();
  const fileInput = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>({ name: "pick" });
  const [included, setIncluded] = useState<boolean[]>([]);
  const [quantities, setQuantities] = useState<number[]>([]);
  const [mealSlot, setMealSlot] = useState<MealSlot>(mealSlotForNow);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPhase({ name: "reading", progress: 0 });
    try {
      const [text] = await Promise.all([
        readScreenshot(file, (progress) => setPhase({ name: "reading", progress })),
        useMenuStore.getState().fetchMenu(selectedDate),
      ]);
      const menu = useMenuStore.getState().menuCache[selectedDate];
      const items = menu ? bistroItems(menu) : [];
      const dishes = matchBistroOrder(parseBistroOrder(text), items);

      if (dishes.length === 0) {
        setPhase({
          name: "error",
          message: "Couldn't find an order in that screenshot. Use the Grubhub screen that lists your items.",
        });
        return;
      }
      setIncluded(dishes.map((d) => dishToMenuItem(d) !== null));
      setQuantities(dishes.map((d) => d.quantity));
      setPhase({ name: "review", dishes, menuFound: items.length > 0 });
    } catch (err) {
      console.error("[ScanOrderPage] Reading the screenshot failed:", err);
      setPhase({
        name: "error",
        message: "Couldn't read that screenshot. Check your connection (the reader downloads the first time) and try again.",
      });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function handleAdd(dishes: MatchedDish[]) {
    let added = 0;
    dishes.forEach((dish, i) => {
      const item = dishToMenuItem(dish);
      if (!item || !included[i]) return;
      addFoodEntry(selectedDate, mealSlot, item, "The Bistro", quantities[i]);
      added++;
    });
    showToast(`Added ${added} item${added === 1 ? "" : "s"} from The Bistro`, "success");
    navigate("/log");
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
          {phase.name === "review" ? "Check Your Order" : "Scan Bistro Order"}
        </h1>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {(phase.name === "pick" || phase.name === "error") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {phase.name === "error" && (
            <div className="glass-2" style={{ padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--color-warning)" }}>
              {phase.message}
            </div>
          )}
          <button className="btn-primary" onClick={() => fileInput.current?.click()} style={{ width: "100%" }}>
            📷 Choose Screenshot
          </button>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
            Take a screenshot of your Bistro order in Grubhub, on the “Your pickup order”,
            “Review your pickup order” or “View order” screen. Each item is matched to the Bistro menu for{" "}
            <strong>{selectedDate}</strong> so you can check it before it’s logged. The screenshot
            is read on your phone and isn’t uploaded.
          </p>
        </div>
      )}

      {phase.name === "reading" && (
        <div className="glass" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          <div style={{ fontWeight: 700 }}>Reading your order…</div>
          <div style={{ marginTop: "0.75rem", height: 6, borderRadius: 3, background: "var(--color-surface-3)", overflow: "hidden" }}>
            <div style={{ width: `${Math.round(phase.progress * 100)}%`, height: "100%", background: "var(--color-primary)", transition: "width 0.2s" }} />
          </div>
        </div>
      )}

      {phase.name === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {!phase.menuFound && (
            <div className="glass-2" style={{ padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--color-warning)" }}>
              No Bistro menu found for {selectedDate}, so nothing could be matched. Pick the day
              you ordered on the Log tab and try again.
            </div>
          )}

          {phase.dishes.map((dish, i) => {
            const item = dishToMenuItem(dish);
            const qty = quantities[i]!;
            return (
              <div key={i} className="glass" style={{ padding: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: item ? "pointer" : "default" }}>
                  <input
                    type="checkbox"
                    checked={included[i] ?? false}
                    disabled={!item}
                    onChange={(e) => setIncluded((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  />
                  <span style={{ flex: 1, fontWeight: 700 }}>{dish.name}</span>
                  <span style={{ fontWeight: 800, color: "var(--color-primary)" }}>
                    {item ? `${Math.round(item.calories * qty)} cal` : "—"}
                  </span>
                </label>

                {dish.dishItem && (
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.5rem" }}>
                    ✓ {dish.dishItem.name} · {dish.dishItem.calories} cal
                  </div>
                )}
                <ul style={{ listStyle: "none", margin: "0.5rem 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {dish.components.map((c, j) => (
                    <li key={j} style={{ fontSize: "0.75rem", color: c.item ? "var(--color-text-2)" : "var(--color-text-3)" }}>
                      {c.item ? `✓ ${c.item.name} · ${c.item.calories} cal` : `✗ ${c.text} — not on the Bistro menu, not counted`}
                    </li>
                  ))}
                </ul>
                {!item && (
                  <div style={{ fontSize: "0.75rem", color: "var(--color-warning)", marginTop: "0.5rem" }}>
                    Nothing in this item matched, so it can’t be added. Use Add Custom Food instead.
                  </div>
                )}

                {item && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--color-text-3)" }}>Quantity</span>
                    <button className="btn-icon" aria-label="Fewer" onClick={() => setQuantities((prev) => prev.map((v, j) => (j === i ? Math.max(1, v - 1) : v)))}>−</button>
                    <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{qty}</span>
                    <button className="btn-icon" aria-label="More" onClick={() => setQuantities((prev) => prev.map((v, j) => (j === i ? v + 1 : v)))}>+</button>
                  </div>
                )}
              </div>
            );
          })}

          <select className="select" value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)}>
            {MEAL_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            className="btn-primary"
            disabled={!included.some(Boolean)}
            onClick={() => handleAdd(phase.dishes)}
            style={{ width: "100%" }}
          >
            Add to {MEAL_SLOTS.find((s) => s.value === mealSlot)!.label}
          </button>
          <button className="btn-ghost" onClick={() => fileInput.current?.click()} style={{ width: "100%" }}>
            Choose a different screenshot
          </button>
        </div>
      )}
    </div>
  );
}
