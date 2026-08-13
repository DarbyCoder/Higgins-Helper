/**
 * @file src/components/log/LogEntryRow.tsx
 * @description A single food log entry row with serving adjustment controls
 * and a swipe-to-delete affordance.
 */
import { useState } from "react";
import type { LoggedFoodEntry } from "@/types";
import { useFoodLogStore, useDateStore } from "@/stores";

interface Props { entry: LoggedFoodEntry; }

const MEAL_COLORS: Record<string, string> = {
  breakfast: "#f59e0b",
  lunch:     "#10b981",
  dinner:    "#3b82f6",
  snack:     "#8b5cf6",
};

export default function LogEntryRow({ entry }: Props) {
  const [showDelete, setShowDelete] = useState(false);
  const { selectedDate } = useDateStore();
  const { removeFoodEntry, updateServings } = useFoodLogStore();

  const color = MEAL_COLORS[entry.mealSlot] ?? "var(--color-text-2)";

  function handleRemove() { removeFoodEntry(selectedDate, entry.id); }
  function handleServChange(delta: number) {
    const next = Math.max(0.5, entry.servings + delta);
    updateServings(selectedDate, entry.id, next);
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.65rem 0.75rem",
      background: "var(--color-surface-2)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      position: "relative",
    }}>
      {/* Meal color pill */}
      <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />

      {/* Item info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "var(--color-text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {entry.menuItemName}
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

      {/* Calories + delete */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-primary-light)" }}>{entry.calories}</div>
        <div style={{ fontSize: "0.6rem", color: "var(--color-text-3)" }}>cal</div>
      </div>

      <button onClick={handleRemove} style={{
        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: "var(--radius-sm)", width: 28, height: 28,
        color: "#f87171", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }} aria-label="Remove entry">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
