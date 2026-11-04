/**
 * @file src/components/dashboard/CalorieRing.tsx
 * @description Ring showing calories eaten against the daily goal: a teal
 * gradient arc with rounded ends and a soft glow, and the number in the middle
 * counting up as the arc sweeps in. Over the goal, the ring and the number turn
 * red; how far over is shown beside the ring.
 *
 * Plain SVG: the arc is a circle's stroke, drawn by stroke-dashoffset and
 * animated with a CSS transition.
 */
import { useEffect, useId, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { formatWhole } from "@/utils/format";

interface Props {
  consumed: number;
  target: number;
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
}

/** How long the arc takes to sweep and the number to count. */
const SWEEP_MS = 900;
/** A little over is still on target; past this the ring turns red. */
const OVER_AT = 1.05;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function CalorieRing({ consumed, target, size = 148, thickness = 12 }: Props) {
  // useId has characters (":" or "«»") that break url(#…) references
  const id = "ring" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pct    = target > 0 ? consumed / target : 0;
  const isOver = pct >= OVER_AT;

  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  // Start empty, then sweep to the value (and from there to each new value)
  const [shownPct, setShownPct] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShownPct(Math.min(pct, 1)));
    return () => cancelAnimationFrame(frame);
  }, [pct]);
  const offset = circumference * (1 - shownPct);

  const shownNumber = useCountUp(consumed, SWEEP_MS);

  const [from, to] = isOver ? ["#FF8A7A", "#E5484D"] : ["#5BE0C2", "#119C80"];
  const arc = {
    cx: size / 2, cy: size / 2, r, fill: "none",
    stroke: `url(#${id}-g)`, strokeWidth: thickness, strokeLinecap: "round" as const,
    strokeDasharray: circumference, strokeDashoffset: offset,
    // Hidden at zero: a round cap would still draw a dot
    opacity: shownPct > 0 ? 1 : 0,
    style: { transition: REDUCED_MOTION ? undefined : `stroke-dashoffset ${SWEEP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` },
  };

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)", overflow: "visible", display: "block" }}
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-track)" strokeWidth={thickness} />
        {/* Glow: a blurred copy under the arc */}
        <circle {...arc} filter={`url(#${id}-glow)`} opacity={arc.opacity * 0.5} />
        <circle {...arc} />
      </svg>

      <div
        aria-label={`${formatWhole(consumed)} calories eaten`}
        role="img"
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{
          fontSize: "2.35rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
          color: isOver ? "var(--color-danger)" : "var(--color-text-1)",
        }}>
          {formatWhole(shownNumber)}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-2)", fontWeight: 500, marginTop: 5 }}>
          cal eaten
        </span>
      </div>
    </div>
  );
}
