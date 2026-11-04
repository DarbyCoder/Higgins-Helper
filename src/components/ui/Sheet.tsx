/**
 * @file src/components/ui/Sheet.tsx
 * @description Bottom sheet: slides up over a dimmed page and closes by
 * dragging it down, tapping outside, Escape, or its Done button. Rendered
 * into <body> so it sits above the bottom nav.
 *
 * Dragging works from the header anywhere, and from the content once it's
 * scrolled to the top, like iOS sheets. Let go past a third of the way, or
 * flick down, and it closes; otherwise it springs back.
 *
 * `onClose` runs after the closing slide finishes, so callers can save there.
 * To close it from inside (e.g. after Add), call `controlRef.current.close()`.
 */
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling content, e.g. an Add button. */
  footer?: ReactNode;
  /** Show a Done button in the header. Default true when there's a title. */
  done?: boolean;
  labelledBy?: string;
  /** Accessible name when there's no visible title to point at. */
  ariaLabel?: string;
  zIndex?: number;
  /** Filled with a close() that slides the sheet away, then calls onClose. */
  controlRef?: MutableRefObject<{ close: () => void } | null>;
}

const OPEN_MS = 380;
const CLOSE_MS = 240;
const EASE = "cubic-bezier(0.2, 0.9, 0.25, 1)";

export default function Sheet({ title, onClose, children, footer, done = !!title, labelledBy, ariaLabel, zIndex = 200, controlRef }: Props) {
  const sheetRef   = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(onClose, reduced ? 0 : CLOSE_MS);
  }
  if (controlRef) controlRef.current = { close };

  // Escape closes the topmost sheet only; the page under the sheet doesn't scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] === sheetRef.current) close();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag to close. A non-passive touchmove, so the drag can stop the content scrolling.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let start: { y: number; t: number; fromHeader: boolean } | null = null;
    let active = false;
    let last = { y: 0, t: 0 };

    const onStart = (e: TouchEvent) => {
      const y = e.touches[0]!.clientY;
      start = { y, t: performance.now(), fromHeader: !!headerRef.current?.contains(e.target as Node) };
      last = { y, t: start.t };
      active = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!start || closingRef.current) return;
      const y = e.touches[0]!.clientY;
      const dy = y - start.y;
      if (!active) {
        const atTop = (contentRef.current?.scrollTop ?? 0) <= 0;
        if (dy > 6 && (start.fromHeader || atTop)) {
          active = true;
          setDragging(true);
        } else {
          return;
        }
      }
      e.preventDefault();
      last = { y, t: performance.now() };
      setDragY(Math.max(0, dy));
    };
    const onEnd = () => {
      if (!start) return;
      if (active) {
        const dy = last.y - start.y;
        const speed = dy / Math.max(1, last.t - start.t); // px per ms
        setDragging(false);
        if (dy > sheet.offsetHeight / 3 || (speed > 0.5 && dy > 40)) close();
        else setDragY(0);
      }
      start = null;
      active = false;
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheetTransform = closing ? "translateY(100%)" : `translateY(${dragY}px)`;
  const sheetTransition = dragging || reduced
    ? "none"
    : closing ? `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)` : `transform 0.32s ${EASE}`;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex, display: "flex", alignItems: "flex-end" }}>
      {/* Backdrop: tap to close; fades as the sheet is dragged down */}
      <div
        aria-hidden
        onClick={close}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          opacity: closing ? 0 : Math.max(0.2, 1 - dragY / 500),
          transition: dragging ? "none" : `opacity ${closing ? CLOSE_MS : 250}ms ease`,
          // "backwards": once finished, the inline opacity (drag, closing) applies again
          animation: reduced ? undefined : `fade-in 0.25s ease backwards`,
        }}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? "sheet-title" : undefined)}
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{
          position: "relative",
          width: "100%", maxWidth: 480, margin: "0 auto",
          maxHeight: "92dvh",
          display: "flex", flexDirection: "column",
          background: "var(--color-surface)",
          borderRadius: "28px 28px 0 0",
          border: "1px solid var(--color-border)", borderBottom: "none",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.35)",
          outline: "none",
          transform: sheetTransform,
          transition: sheetTransition,
          // "backwards", not "both": a held animation would override the drag's transform
          animation: reduced ? undefined : `sheet-in ${OPEN_MS}ms ${EASE} backwards`,
        }}
      >
        {/* Handle and title: always draggable */}
        <div ref={headerRef} style={{ flexShrink: 0, touchAction: "none" }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "0.6rem 0 0.4rem" }}>
            <div style={{ width: 38, height: 5, borderRadius: 3, background: "var(--color-border-2)" }} />
          </div>
          {(title || done) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.1rem 1.25rem 0.6rem" }}>
              <h2 id="sheet-title" style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.01em", color: "var(--color-text-1)" }}>
                {title}
              </h2>
              {done && (
                <button
                  onClick={close}
                  style={{ background: "none", border: "none", padding: "0.3rem 0", cursor: "pointer", color: "var(--color-primary-light)", fontSize: "0.95rem", fontWeight: 700 }}
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>

        <div
          ref={contentRef}
          style={{
            flex: 1, overflowY: "auto", overscrollBehavior: "contain",
            padding: footer ? "0.25rem 1.25rem 1.25rem" : "0.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>

        {footer && (
          <div style={{
            flexShrink: 0,
            padding: "0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid var(--color-border)",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
