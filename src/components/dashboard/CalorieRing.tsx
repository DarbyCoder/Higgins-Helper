/**
 * @file src/components/dashboard/CalorieRing.tsx
 * @description D3-powered animated SVG donut chart showing calories consumed
 * vs. daily target. Color transitions green → amber → red as the user approaches
 * and exceeds their goal. Features a smooth sweep-in animation on mount/update.
 */
import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Props {
  consumed: number;
  target: number;
  size?: number;       // outer diameter in px (default 180)
  thickness?: number;  // ring thickness in px (default 22)
}

/** Returns the hex color for a given percentage of goal consumed */
function ringColor(pct: number): string {
  if (pct >= 1.05) return "#ef4444"; // Over by >5% → red
  if (pct >= 0.9)  return "#f59e0b"; // 90-105% → amber
  if (pct >= 0.7)  return "#10b981"; // 70-90% → green
  return "#c41e3a";                   // <70% → crimson (primary)
}

export default function CalorieRing({ consumed, target, size = 180, thickness = 22 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pct    = target > 0 ? consumed / target : 0;
  const clampedPct = Math.min(pct, 1);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const r     = size / 2;
    const inner = r - thickness;
    const g     = svg.append("g").attr("transform", `translate(${r},${r})`);

    // ── Background track arc ──
    const trackArc = d3.arc<unknown>()
      .innerRadius(inner)
      .outerRadius(r)
      .startAngle(0)
      .endAngle(2 * Math.PI)
      .cornerRadius(6);

    g.append("path")
      .attr("d", trackArc(null as unknown) ?? "")
      .attr("fill", "rgba(255,255,255,0.05)");

    // ── Progress arc ──
    const color = ringColor(pct);
    const progressArc = d3.arc<unknown>()
      .innerRadius(inner)
      .outerRadius(r)
      .startAngle(0)
      .cornerRadius(6);

    const pathEl = g.append("path")
      .attr("fill", color)
      .style("filter", `drop-shadow(0 0 8px ${color}66)`);

    // Sweep-in animation using d3 transition + attrTween
    pathEl.datum({ endAngle: 0 })
      .attr("d", function(d: { endAngle: number }) {
        return progressArc.endAngle(d.endAngle)(null as unknown) ?? "";
      })
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attrTween("d", function(this: Element, d: { endAngle: number }) {
        const interp = d3.interpolate(0, clampedPct * 2 * Math.PI);
        return (t: number) => {
          d.endAngle = interp(t);
          return progressArc.endAngle(d.endAngle)(null as unknown) ?? "";
        };
      });

    // ── Overflow arc (shows when over target, layered in red) ──
    if (pct > 1) {
      const overArc = d3.arc<unknown>()
        .innerRadius(inner - 4)
        .outerRadius(r + 2)
        .startAngle(0)
        .endAngle(Math.min((pct - 1) * 2 * Math.PI, 2 * Math.PI))
        .cornerRadius(4);

      g.append("path")
        .attr("fill", "rgba(239,68,68,0.7)")
        .attr("d", overArc(null as unknown) ?? "");
    }

  }, [consumed, target, size, thickness, pct, clampedPct]);

  const remaining = Math.max(0, target - consumed);
  const isOver = consumed > target;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg ref={svgRef} width={size} height={size} />
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: "0.65rem", color: "var(--color-text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {isOver ? "over" : "eaten"}
        </span>
        <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--color-text-1)", lineHeight: 1.1 }}>
          {consumed.toLocaleString()}
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--color-text-2)", marginTop: 2 }}>
          {isOver
            ? `+${(consumed - target).toLocaleString()} kcal`
            : `${remaining.toLocaleString()} left`}
        </span>
      </div>
    </div>
  );
}
