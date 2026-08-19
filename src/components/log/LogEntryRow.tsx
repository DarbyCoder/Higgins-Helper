/**
 * @file src/components/log/LogEntryRow.tsx
 * @description A single food log entry row with:
 * - Serving adjustment controls (+ / −)
 * - Swipe-left to auto-delete (no confirmation button needed)
 * - Haptic feedback on actions (where supported)
 */
import { useRef, useState } from "react";
import type { LoggedFoodEntry } from "@/types";
import { useFoodLogStore, useDateStore } from "@/stores";

interface Props { entry: LoggedFoodEntry; }

const MEAL_COLORS: Record<string, string> = {
  breakfast: "#f59e0b",
  lunch:     "#10b981",
  dinner:    "#3b82f6",
  snack:     "#8b5cf6",
};

/** Fire a short haptic pulse if the browser supports it. */
function haptic(ms = 40) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

export default function LogEntryRow({ entry }: Props) {
  const { selectedDate } = useDateStore();
  const { removeFoodEntry, updateServings } = useFoodLogStore();

  const color = MEAL_COLORS[entry.mealSlot] ?? "var(--color-text-2)";

  // ── Swipe state ───────────────────────────────────────────────────────────
  const [swipeX, setSwipeX]       = useState(0);
  const [deleting, setDeleting]   = useState(false);
  const touchStartX               = useRef<number | null>(null);
  const isDragging                = useRef(false);
  const ACTION_THRESHOLD          = 80; // px swipe needed to trigger action

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    isDragging.current  = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 4) isDragging.current = true;
    
    // dx < 0 is swipe left (delete). Only allow swipe left.
    if (dx < 0) {
      setSwipeX(Math.max(dx, -ACTION_THRESHOLD - 30));
    } else {
      setSwipeX(0); // Prevent swipe right
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    
    // Calculate exact final offset upon release to avoid stale state
    const finalX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const finalDx = finalX - touchStartX.current;
    
    touchStartX.current = null;
    
    if (finalDx < -ACTION_THRESHOLD) {
      // Trigger delete
      haptic(60);
      setDeleting(true);
      setSwipeX(-999);
      setTimeout(() => removeFoodEntry(selectedDate, entry.id), 280);
    } else {
      // Snap back
      setSwipeX(0);
    }
    isDragging.current = false;
  }

  function handleServChange(delta: number) {
    haptic(30);
    const next = Math.max(0.5, entry.servings + delta);
    updateServings(selectedDate, entry.id, next);
  }

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      borderRadius: "var(--radius-md)",
      opacity: deleting ? 0 : 1,
      maxHeight: deleting ? 0 : 200,
      marginBottom: deleting ? 0 : undefined,
      transition: deleting
        ? "opacity 0.25s ease, max-height 0.3s ease 0.05s"
        : "none",
    }}>

      {/* Action hints shown behind row when swiping */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
        background: "linear-gradient(135deg, #ef4444, #dc2626)",
        display: "flex", alignItems: "center", 
        justifyContent: "flex-end",
        padding: "0 1.25rem 0 0",
        borderRadius: "var(--radius-md)",
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
            <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
            <path d="M10,11v6M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
          </svg>
          <span style={{ fontSize: "0.55rem", color: "#fff", fontWeight: 700 }}>DELETE</span>
        </div>
      </div>

      {/* Main row */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.65rem 0.75rem",
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          position: "relative",
          transform: `translateX(${swipeX}px)`,
          transition: isDragging.current ? "none" : "transform 0.25s cubic-bezier(0.2,0.8,0.2,1)",
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        {/* Meal color pill */}
        <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />

        {/* Item info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "var(--color-text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.menuItemName}
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-3)", marginTop: 1 }}>
            {entry.locationName} · {entry.servings}× serving
          </div>
        </div>

        {/* Servings controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <button onClick={() => handleServChange(-0.5)} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", width: 22, height: 22, color: "var(--color-text-2)", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <button onClick={() => handleServChange(0.5)} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", width: 22, height: 22, color: "var(--color-text-2)", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>

        {/* Calories */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-primary-light)" }}>{entry.calories}</div>
          <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)" }}>cal</div>
        </div>
      </div>
    </div>
  );
}
