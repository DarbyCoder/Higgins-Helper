/**
 * @file src/components/menu/MenuHeaderControls.tsx
 * @description The Menu tab's header: the day being browsed (tap to change),
 * a Search pill, and a Clark / Worcester dropdown.
 */
import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores";
import type { MenuArea } from "@/stores/useUIStore";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/icons";

const AREAS: { value: MenuArea; label: string; hint: string }[] = [
  { value: "clark",     label: "Clark",     hint: "Higgins and The Bistro" },
  { value: "worcester", label: "Worcester", hint: "Restaurants near campus" },
];

const PILL: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7, height: 42,
  borderRadius: "var(--radius-full)", cursor: "pointer",
  background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)",
  color: "var(--color-text-1)", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap",
};

/** Above the title: "Wed, Nov 4 ▾", opening the day picker. */
export function MenuDateButton({ label }: { label: string }) {
  const setMenuSheet = useUIStore((s) => s.setMenuSheet);
  return (
    <button
      onClick={() => setMenuSheet("date")}
      aria-label={`${label}. Change day`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "0.15rem 0", margin: "-0.15rem 0",
        background: "none", border: "none", cursor: "pointer",
        fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-2)",
      }}
    >
      {label}
      <ChevronDownIcon size={12} strokeWidth={2.6} />
    </button>
  );
}

export default function MenuHeaderControls() {
  const { menuArea, setMenuArea, setMenuSheet } = useUIStore();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = AREAS.find((a) => a.value === menuArea)!;

  // Close the dropdown on a tap outside it or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function search() {
    if (menuArea === "clark") return setMenuSheet("search");
    // Worcester keeps its search box on the page
    const input = document.getElementById("menu-inline-search");
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
    input?.focus();
  }

  return (
    <div ref={wrap} style={{ position: "relative", display: "flex", gap: 8, flexShrink: 0, marginBottom: 2 }}>
      <button className="pressable" onClick={search} aria-label="Search the menu" style={{ ...PILL, padding: "0 1rem 0 0.85rem" }}>
        <SearchIcon size={17} strokeWidth={2.2} />
        <span className="menu-search-label">Search</span>
      </button>

      <button
        className="pressable"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${current.label}. Change area`}
        style={{ ...PILL, gap: 5, padding: "0 0.8rem 0 0.95rem" }}
      >
        {current.label}
        <ChevronDownIcon size={13} strokeWidth={2.6} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div role="menu" style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 120, width: 236,
          padding: 6, borderRadius: "var(--radius-lg)",
          background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          animation: "fade-in 0.16s ease",
        }}>
          {AREAS.map((a) => (
            <button
              key={a.value}
              role="menuitemradio"
              aria-checked={a.value === menuArea}
              onClick={() => { setMenuArea(a.value); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "0.6rem 0.7rem", borderRadius: "var(--radius-md)",
                background: a.value === menuArea ? "var(--color-primary-ghost)" : "none",
                border: "none", cursor: "pointer", textAlign: "left", color: "var(--color-text-1)",
              }}
            >
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: "0.9rem", fontWeight: 700 }}>{a.label}</span>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: 1 }}>{a.hint}</span>
              </span>
              {a.value === menuArea && <CheckIcon size={17} strokeWidth={2.4} style={{ color: "var(--color-primary-light)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
