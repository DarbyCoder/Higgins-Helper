/**
 * @file src/components/menu/DishSections.tsx
 * @description A meal's dishes in collapsible sections (stations or food
 * groups). The first starts open. An open section is a card of its own;
 * closed ones in a row share a card, so a long list of stations stays short.
 */
import { useState } from "react";
import type { MenuItem } from "@/types";
import MenuRow, { type RowTag } from "./MenuRow";
import { ChevronDownIcon } from "@/components/icons";

export interface DishSection {
  key: string;
  title: string;
  dishes: { item: MenuItem; tag?: RowTag }[];
}

interface Props {
  sections: DishSection[];
  onSelect: (item: MenuItem) => void;
}

const CARD: React.CSSProperties = {
  borderRadius: "var(--radius-xl)", overflow: "hidden",
  background: "var(--color-surface)", border: "1px solid var(--color-border)",
};

export default function DishSections({ sections, onSelect }: Props) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(sections[0] ? [sections[0].key] : []));

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Runs of closed sections share one card; each open one gets its own
  const cards: DishSection[][] = [];
  for (const s of sections) {
    const last = cards[cards.length - 1];
    if (!open.has(s.key) && last && !open.has(last[0].key)) last.push(s);
    else cards.push([s]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {cards.map((group) => (
        <div key={group[0].key} style={CARD}>
          {group.map((s, i) => {
            const isOpen = open.has(s.key);
            return (
              <section key={s.key} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                <button
                  onClick={() => toggle(s.key)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "1rem 1rem", background: isOpen ? "var(--color-surface-2)" : "none",
                    border: "none", cursor: "pointer", textAlign: "left", color: "var(--color-text-1)",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, fontSize: "1rem", fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-2)", flexShrink: 0 }}>
                    {s.dishes.length} item{s.dishes.length === 1 ? "" : "s"}
                  </span>
                  <ChevronDownIcon size={16} strokeWidth={2.4} style={{
                    flexShrink: 0, color: "var(--color-text-2)",
                    transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s",
                  }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 1rem", animation: "fade-in 0.2s ease" }}>
                    {s.dishes.map(({ item, tag }, j) => (
                      <div key={`${item.id}-${j}`} style={{ borderTop: j > 0 ? "1px solid var(--color-border)" : undefined }}>
                        <MenuRow item={item} tag={tag} onSelect={onSelect} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}
