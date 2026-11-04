/**
 * @file src/components/log/LogEntryRow.tsx
 * @description A single food log entry row with:
 * - Serving adjustment controls (+ / −)
 * - Swipe-left to auto-delete (no confirmation button needed)
 * - Haptic feedback on actions (where supported)
 */
import type { LoggedFoodEntry } from "@/types";
import { useFoodLogStore, useDateStore } from "@/stores";
import { useSwipeToDelete } from "@/hooks/useSwipeToDelete";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatWhole } from "@/utils/format";

interface Props { entry: LoggedFoodEntry; }

/** Round +/− and delete buttons, big enough to hit with a thumb. */
const STEP_BUTTON: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%", padding: 0, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--color-surface-3)", border: "1px solid var(--color-border)",
  color: "var(--color-text-1)", cursor: "pointer",
};

/** Fire a short haptic pulse if the browser supports it. */
function haptic(ms = 40) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

export default function LogEntryRow({ entry }: Props) {
  const { selectedDate } = useDateStore();
  const { removeFoodEntry, updateServings } = useFoodLogStore();

  // ── Swipe state ───────────────────────────────────────────────────────────
  const { swipeX, deleting, handlers, triggerDelete } = useSwipeToDelete(() => {
    removeFoodEntry(selectedDate, entry.id);
  });

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
          <TrashIcon size={18} strokeWidth={2.2} style={{ color: "#fff" }} />
          <span style={{ fontSize: "0.6rem", color: "#fff", fontWeight: 700 }}>Delete</span>
        </div>
      </div>

      {/* Main row */}
      <div
        {...handlers}
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.75rem 0.85rem",
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          position: "relative",
          transform: `translateX(${swipeX}px)`,
          transition: swipeX !== 0 && swipeX > -80 ? "none" : "transform 0.25s cubic-bezier(0.2,0.8,0.2,1)",
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        {/* Item info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.menuItemName}
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {entry.locationName} · {entry.servings} serving{entry.servings === 1 ? "" : "s"}
          </div>
        </div>

        {/* Servings controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {entry.servings <= 0.5 ? (
            <button
              onClick={triggerDelete}
              style={{ ...STEP_BUTTON, color: "var(--color-danger)", borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)" }}
              aria-label="Delete entry"
            >
              <TrashIcon size={14} strokeWidth={2.2} />
            </button>
          ) : (
            <button onClick={() => handleServChange(-0.5)} style={STEP_BUTTON} aria-label="Decrease serving">
              <MinusIcon size={14} strokeWidth={2.4} />
            </button>
          )}
          <button onClick={() => handleServChange(0.5)} style={STEP_BUTTON} aria-label="Increase serving">
            <PlusIcon size={14} strokeWidth={2.4} />
          </button>
        </div>

        {/* Calories */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text-1)", minWidth: 36 }}>{formatWhole(entry.calories)}</div>
          <div style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--color-text-3)" }}>cal</div>
        </div>
      </div>
    </div>
  );
}
