/**
 * @file src/components/menu/MenuTabs.tsx
 * @description "Bistro | Higgins | Worcester" under the Menu header. Plain
 * text tabs with a teal underline that slides to the chosen one.
 */
import { useLayoutEffect, useRef, useState } from "react";

export interface MenuTab {
  id: string;
  label: string;
}

interface Props {
  tabs: MenuTab[];
  value: string;
  onChange: (id: string) => void;
}

export default function MenuTabs({ tabs, value, onChange }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  // The underline sits under the chosen tab's slot, and slides between them
  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, tabs.length]);

  return (
    <div role="tablist" aria-label="Where to eat" style={{
      position: "relative", display: "flex",
      borderBottom: "1px solid var(--color-border-2)",
    }}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, padding: "0.65rem 0 0.8rem", background: "none", border: "none", cursor: "pointer",
              fontSize: "1rem", fontWeight: active ? 800 : 650,
              color: active ? "var(--color-text-1)" : "var(--color-text-2)",
              transition: "color 0.2s",
            }}
          >
            {t.label}
          </button>
        );
      })}
      {bar && (
        <span aria-hidden style={{
          position: "absolute", bottom: -1, height: 3, borderRadius: 3,
          left: bar.left, width: bar.width,
          background: "var(--color-primary-light)",
          transition: "left 0.3s cubic-bezier(0.2,0.9,0.25,1), width 0.3s cubic-bezier(0.2,0.9,0.25,1)",
        }} />
      )}
    </div>
  );
}
