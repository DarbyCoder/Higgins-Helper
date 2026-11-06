/**
 * @file src/components/menu/MenuSearchSheet.tsx
 * @description Search every dish served that day, toppings and sides
 * included: at Higgins and The Bistro, or on the Worcester tab, at the
 * restaurants near campus. The meal being browsed comes first. Diet and High
 * protein chips apply here too.
 */
import { useEffect, useMemo, useRef } from "react";
import type { DiningLocation, MenuItem } from "@/types";
import { useUIStore } from "@/stores";
import Sheet from "@/components/ui/Sheet";
import MenuRow from "./MenuRow";
import MenuFilters from "./MenuFilters";
import { SearchIcon, XIcon } from "@/components/icons";
import { filterByDietary } from "@/utils/dietary";
import { HIGH_PROTEIN_G, mealSlotFor, num, stationLabel } from "@/utils/menuHelpers";

interface Props {
  locations: DiningLocation[];
  /** The location and meal being browsed, listed first. */
  slug: string;
  meal: string;
  /** "Higgins and The Bistro", or "restaurants near campus". */
  scope: string;
  onSelect: (item: MenuItem, locationName: string, mealName: string) => void;
  onClose: () => void;
}

interface Group {
  key: string;
  label: string;
  locationName: string;
  mealName: string;
  items: { item: MenuItem; station: string }[];
}

const MAX_RESULTS = 80;

/** "The Table at Higgins" → "Higgins" */
const shortName = (name: string) => name.replace(/^the table at /i, "").replace(/^the /i, "");

export default function MenuSearchSheet({ locations, slug, meal, scope, onSelect, onClose }: Props) {
  const { searchQuery, setSearchQuery, activeDietaryFilters, highProtein } = useUIStore();
  const q = searchQuery.trim().toLowerCase();
  const input = useRef<HTMLInputElement>(null);

  // After the sheet has taken focus for itself on opening
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, []);

  const groups = useMemo(() => {
    if (!q) return [];
    // The meal being browsed first, then the rest of that location, then elsewhere
    // (at the other place, its meal at the same time of day first)
    const slot = mealSlotFor(meal);
    const order = (l: DiningLocation, m: string) =>
      l.slug === slug ? (m === meal ? 0 : 1) : mealSlotFor(m) === slot ? 2 : 3;
    const all: (Group & { rank: number })[] = [];
    for (const l of locations) {
      for (const m of l.meals) {
        const seen = new Set<string>();
        const items: Group["items"] = [];
        // A search for the place itself lists everything it serves
        const placeHit = l.name.toLowerCase().includes(q);
        for (const s of m.stations ?? []) {
          const hit = placeHit || (s.name ?? "").toLowerCase().includes(q);
          let found = (s.items ?? []).filter((i) => hit || (i.name ?? "").toLowerCase().includes(q));
          found = filterByDietary(found, activeDietaryFilters);
          if (highProtein) found = found.filter((i) => num(i.protein) >= HIGH_PROTEIN_G);
          for (const item of found) {
            const k = (item.name ?? "").toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            items.push({ item, station: s.name ?? "" });
          }
        }
        if (items.length) {
          all.push({
            key: `${l.slug}|${m.name}`, rank: order(l, m.name),
            label: l.meals.length > 1 ? `${shortName(l.name)} · ${m.name}` : shortName(l.name),
            locationName: l.name, mealName: m.name, items,
          });
        }
      }
    }
    all.sort((a, b) => a.rank - b.rank);
    // Cap the total so a one-letter search stays quick to draw
    let left = MAX_RESULTS;
    const capped: Group[] = [];
    for (const g of all) {
      if (left <= 0) break;
      capped.push({ ...g, items: g.items.slice(0, left) });
      left -= g.items.length;
    }
    return capped;
  }, [q, locations, slug, meal, activeDietaryFilters, highProtein]);

  const count = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <Sheet title="Search the menu" onClose={onClose}>
      <div style={{ minHeight: "62dvh" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--color-surface)", paddingBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)", pointerEvents: "none", display: "flex" }}>
              <SearchIcon size={18} />
            </span>
            <input
              ref={input}
              className="input"
              autoFocus
              type="text"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Pizza, tofu, wrap…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search dishes"
              style={{ paddingLeft: "2.6rem", paddingRight: searchQuery ? "2.6rem" : undefined, height: 48, fontSize: "1rem", borderRadius: "var(--radius-full)" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="Clear search" style={{
                position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
                width: 30, height: 30, display: "grid", placeItems: "center",
                background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)",
              }}><XIcon size={17} /></button>
            )}
          </div>
          <MenuFilters showBudget={false} />
        </div>

        {!q ? (
          <p style={{ margin: "1.5rem 0", textAlign: "center", fontSize: "0.85rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
            Every dish at {scope} today,<br />toppings and sides included.
          </p>
        ) : count === 0 ? (
          <p style={{ margin: "1.5rem 0", textAlign: "center", fontSize: "0.85rem", color: "var(--color-text-3)" }}>
            Nothing called “{searchQuery.trim()}”{activeDietaryFilters.length || highProtein ? " with these filters" : ""} today.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.key} style={{ marginBottom: "0.9rem" }}>
              <div className="section-title" style={{ margin: "0.4rem 0 0" }}>{g.label}</div>
              {g.items.map(({ item, station }) => (
                <div key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <MenuRow item={item} tag={station ? { label: stationLabel(station) } : undefined} onSelect={(i) => onSelect(i, g.locationName, g.mealName)} />
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </Sheet>
  );
}
