/**
 * @file src/components/menu/LocationSwitch.tsx
 * @description "Higgins · Dinner | The Bistro". The chosen location shows the
 * meal being browsed; tapping it again opens a picker of that day's meals.
 */
import { useState } from "react";
import type { DiningLocation } from "@/types";
import Sheet from "@/components/ui/Sheet";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { findActiveMealPeriod } from "@/utils/time";
import { mealLabel } from "@/utils/mains";

interface Props {
  locations: DiningLocation[];
  slug: string;
  meal: string;
  /** Whether the day browsed is today, for the "Now" tag. */
  isToday: boolean;
  onSelect: (slug: string) => void;
  onMeal: (meal: string) => void;
}

/** "The Table at Higgins" → "Higgins"; "The Bistro" stays. */
export function shortName(name: string): string {
  return name.replace(/^the table at /i, "");
}

export default function LocationSwitch({ locations, slug, meal, isToday, onSelect, onMeal }: Props) {
  const [picking, setPicking] = useState(false);
  const current = locations.find((l) => l.slug === slug);
  const now = isToday && current ? findActiveMealPeriod(current.meals)?.name : undefined;

  return (
    <>
      <div role="tablist" aria-label="Dining location" style={{
        display: "flex", padding: 4, gap: 4,
        borderRadius: "var(--radius-full)",
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
      }}>
        {locations.map((l) => {
          const active = l.slug === slug;
          const canPick = active && l.meals.length > 1;
          return (
            <button
              key={l.slug}
              role="tab"
              aria-selected={active}
              aria-haspopup={canPick ? "dialog" : undefined}
              aria-label={active && meal ? `${shortName(l.name)}, ${mealLabel(meal)}${canPick ? ", change meal" : ""}` : shortName(l.name)}
              onClick={() => (active ? canPick && setPicking(true) : onSelect(l.slug))}
              className="pressable"
              style={{
                flex: active ? 1.25 : 1, minWidth: 0, height: 40,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "0 0.75rem", border: "none", cursor: "pointer",
                borderRadius: "var(--radius-full)",
                fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap",
                background: active ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" : "transparent",
                boxShadow: active ? "0 2px 12px rgba(20,160,133,0.35)" : "none",
                color: active ? "#fff" : "var(--color-text-2)",
                transition: "flex 0.3s cubic-bezier(0.2,0.9,0.25,1), background 0.2s, color 0.2s",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {active && meal ? `${shortName(l.name).replace(/^the /i, "")} · ${mealLabel(meal)}` : shortName(l.name)}
              </span>
              {canPick && <ChevronDownIcon size={13} strokeWidth={2.6} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {picking && current && (
        <Sheet title={`${shortName(current.name)} meals`} onClose={() => setPicking(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: "0.5rem" }}>
            {current.meals.map((m) => {
              const selected = m.name === meal;
              return (
                <button
                  key={m.name}
                  className="pressable"
                  onClick={() => { onMeal(m.name); setPicking(false); }}
                  aria-pressed={selected}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.85rem 1rem", borderRadius: "var(--radius-lg)", cursor: "pointer", textAlign: "left",
                    background: selected ? "var(--color-primary-ghost)" : "var(--color-surface-2)",
                    border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                    color: "var(--color-text-1)",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "0.95rem" }}>
                      {m.name}
                      {m.name === now && (
                        <span style={{ marginLeft: 8, fontSize: "0.68rem", fontWeight: 700, color: "var(--color-primary-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Now</span>
                      )}
                    </span>
                    {m.startTime && m.endTime && (
                      <span style={{ display: "block", marginTop: 2, fontSize: "0.78rem", color: "var(--color-text-2)" }}>{m.startTime} – {m.endTime}</span>
                    )}
                  </span>
                  {selected && <CheckIcon size={18} strokeWidth={2.4} style={{ color: "var(--color-primary-light)" }} />}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}
