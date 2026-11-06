/**
 * @file src/components/restaurants/WorcesterView.tsx
 * @description The Menu tab's Worcester side: a map of restaurants around
 * Clark filling the screen, area chips over it, and the restaurant list in a
 * panel that drags up over the map (like Apple or Google Maps). Tapping a
 * restaurant opens its menu; items open MenuPage's NutritionModal, so logging
 * works exactly like the Higgins menu.
 *
 * Lazy-loaded by MenuPage, which keeps Leaflet out of the main bundle.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { MenuItem, Restaurant } from "@/types";
import { useDateStore, useUIStore } from "@/stores";
import { RESTAURANT_AREAS, WORCESTER_RESTAURANTS } from "@/data/worcesterRestaurants";
import { distanceFromClark, formatDistance, isRestaurantOpenNow, restaurantMatches } from "@/utils/restaurants";
import RestaurantMap, { MAP_CHIPS, type MapFocus } from "./RestaurantMap";
import RestaurantMenuSheet from "./RestaurantMenuSheet";
import { ChevronRightIcon } from "@/components/icons";

interface Props {
  onSelectItem: (item: MenuItem, locationName: string, mealName?: string) => void;
}

/** How much of the list shows when it's down: its heading and one restaurant. */
const PEEK = 168;
const CHIPS_H = 56;
const EASE = "cubic-bezier(0.2, 0.9, 0.25, 1)";

type Snap = "peek" | "half" | "full";

export default function WorcesterView({ onSelectItem }: Props) {
  const { selectedDate } = useDateStore();
  const { activeDietaryFilters } = useUIStore();
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [focus, setFocus] = useState<MapFocus>("all");

  const visible = useMemo(
    () => WORCESTER_RESTAURANTS.filter((r) => restaurantMatches(r, "", activeDietaryFilters)),
    [activeDietaryFilters],
  );
  // Open/closed is read off the clock at render time
  const openSlugs = new Set(visible.filter((r) => isRestaurantOpenNow(r, selectedDate)).map((r) => r.slug));
  const closeSheet = useCallback(() => setSelected(null), []);

  // ── Fill the screen from here down to the bottom nav ──
  const frame = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(560);
  useLayoutEffect(() => {
    const measure = () => {
      const top = frame.current?.getBoundingClientRect().top ?? 0;
      const nav = document.querySelector("nav")?.getBoundingClientRect().height ?? 64;
      setHeight(Math.max(380, Math.round(window.innerHeight - top - nav + window.scrollY)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── The list panel: three resting heights, dragged by its top ──
  const full = height - CHIPS_H - 8;
  const offsets: Record<Snap, number> = { full: 0, half: full - Math.round(height * 0.5), peek: full - PEEK };
  const [snap, setSnap] = useState<Snap>("peek");
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ startY: number; from: number; t: number } | null>(null);

  function onDown(e: ReactPointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, from: offsets[snap], t: performance.now() };
    setDragY(offsets[snap]);
  }
  function onMove(e: ReactPointerEvent) {
    if (!drag.current) return;
    setDragY(Math.min(offsets.peek, Math.max(0, drag.current.from + e.clientY - drag.current.startY)));
  }
  function onUp(e: ReactPointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const moved = e.clientY - d.startY;
    const y = dragY ?? d.from;
    setDragY(null);
    // A tap steps up a level (and back down from the top)
    if (Math.abs(moved) < 6) return setSnap(snap === "peek" ? "half" : snap === "half" ? "full" : "peek");
    // A flick goes the way it was thrown; otherwise the nearest height
    const v = moved / Math.max(1, performance.now() - d.t);
    const order: Snap[] = ["full", "half", "peek"];
    if (Math.abs(v) > 0.5) {
      const i = order.indexOf(snap) + (v > 0 ? 1 : -1);
      return setSnap(order[Math.min(2, Math.max(0, i))]);
    }
    setSnap(order.reduce((a, b) => (Math.abs(offsets[b] - y) < Math.abs(offsets[a] - y) ? b : a)));
  }

  const y = dragY ?? offsets[snap];
  const areas = RESTAURANT_AREAS.filter((a) => focus === "all" || a.id === focus);

  return (
    <div ref={frame} style={{ position: "relative", height, margin: "0 -1rem", overflow: "hidden" }}>
      {/* Map, with room kept for the chips above and the list below */}
      <div style={{ position: "absolute", inset: 0 }}>
        <RestaurantMap
          restaurants={visible}
          openSlugs={openSlugs}
          onSelect={setSelected}
          focus={focus}
          insetTop={CHIPS_H}
          insetBottom={PEEK}
        />
      </div>

      {/* Area chips over the map */}
      <div className="no-scrollbar" style={{
        position: "absolute", top: 10, left: 0, right: 0, zIndex: 2,
        display: "flex", gap: 8, overflowX: "auto", padding: "0 1rem",
      }}>
        {MAP_CHIPS.map(({ id, label }) => {
          const on = id === focus;
          return (
            <button key={id} onClick={() => setFocus(id)} aria-pressed={on} className="pressable" style={{
              flexShrink: 0, height: 38, padding: "0 1rem", borderRadius: "var(--radius-full)", cursor: "pointer",
              fontSize: "0.85rem", fontWeight: 650,
              border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border-2)"}`,
              background: on ? "color-mix(in srgb, var(--color-primary) 22%, var(--color-surface))" : "color-mix(in srgb, var(--color-surface) 92%, transparent)",
              color: on ? "var(--color-primary-light)" : "var(--color-text-1)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* The list, dragged up over the map */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: full, zIndex: 3,
        display: "flex", flexDirection: "column",
        background: "var(--color-surface)", borderTop: "1px solid var(--color-border-2)",
        borderRadius: "24px 24px 0 0", boxShadow: "0 -10px 30px rgba(0,0,0,0.35)",
        transform: `translateY(${y}px)`,
        transition: dragY === null ? `transform 0.35s ${EASE}` : "none",
      }}>
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="button"
          aria-label={snap === "full" ? "Show more map" : "Show more restaurants"}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSnap(snap === "full" ? "peek" : "full"); } }}
          style={{ touchAction: "none", cursor: "grab", padding: "10px 0 4px", flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 5, borderRadius: 3, background: "var(--color-border-2)", margin: "0 auto" }} />
        </div>

        <div style={{
          flex: 1, minHeight: 0, padding: "0.4rem 1rem calc(1rem + env(safe-area-inset-bottom))",
          overflowY: snap === "peek" && dragY === null ? "hidden" : "auto", overscrollBehavior: "contain",
        }}>
          {visible.length === 0 ? (
            <p style={{ margin: "0.75rem 0", textAlign: "center", fontSize: "0.85rem", color: "var(--color-text-3)" }}>
              No nearby menu has a dish that fits your diet filters.
            </p>
          ) : areas.map((area) => {
            // Open places first, then nearest
            const inArea = visible
              .filter((r) => r.area === area.id)
              .sort((a, b) => Number(openSlugs.has(b.slug)) - Number(openSlugs.has(a.slug)) || distanceFromClark(a) - distanceFromClark(b));
            if (inArea.length === 0) return null;
            return (
              <section key={area.id} style={{ marginBottom: "1rem" }}>
                <div className="section-title" style={{ margin: "0.35rem 0 0.6rem" }}>{area.label} ({inArea.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {inArea.map((r) => (
                    <RestaurantRow key={r.slug} restaurant={r} isOpen={openSlugs.has(r.slug)} onSelect={setSelected} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <RestaurantMenuSheet restaurant={selected} date={selectedDate} onClose={closeSheet} onSelectItem={onSelectItem} />
    </div>
  );
}

function RestaurantRow({ restaurant, isOpen, onSelect }: { restaurant: Restaurant; isOpen: boolean; onSelect: (r: Restaurant) => void }) {
  return (
    <button
      className="pressable"
      onClick={() => onSelect(restaurant)}
      style={{
        width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.9rem 1rem", borderRadius: "var(--radius-lg)", cursor: "pointer",
        background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-1)",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.98rem", fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {restaurant.name}
        </span>
        <span style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-2)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {restaurant.cuisine} · {formatDistance(distanceFromClark(restaurant))}
        </span>
      </span>
      <span style={{
        flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)", fontSize: "0.78rem", fontWeight: 700,
        background: isOpen ? "var(--color-primary-ghost)" : "rgba(239,68,68,0.12)",
        color: isOpen ? "var(--color-primary-light)" : "#f87171",
      }}>
        {isOpen ? "Open" : "Closed"}
      </span>
      <ChevronRightIcon size={16} style={{ color: "var(--color-text-3)", flexShrink: 0 }} />
    </button>
  );
}
