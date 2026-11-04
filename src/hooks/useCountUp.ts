/**
 * @file src/hooks/useCountUp.ts
 * @description Counts a number up (or down) to `value` with an ease-out, so a
 * total rolls to its new figure instead of jumping. Starts from 0 on mount.
 * Jumps straight there for people who prefer reduced motion.
 */
import { useEffect, useRef, useState } from "react";

export function useCountUp(value: number, durationMs = 900): number {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(reduced ? value : 0);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const from = shownRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduced]);

  return shown;
}
