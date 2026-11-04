/**
 * @file src/components/tour/IntroTour.tsx
 * @description First-launch intro tour: a personal welcome card, then a
 * spotlight that dims the app and highlights one real element at a time
 * (switching tabs as needed). It ends on the Notifications section of Profile,
 * where the tooltip offers to turn meal reminders on. Content lives in
 * tourSteps.ts.
 *
 * The tab the tour has opened stays lit in the bottom nav and is named in the
 * tooltip. Between steps the highlights glide to their new place. When the
 * tour changes tab, the old page slides out and the new one slides in from the
 * side of the tab it's going to, like a carousel; the lit tab glides along the
 * nav and pops, and the tooltip slides in from that side. "Done" on the last
 * step ends on the Today page with the same slide.
 *
 * Plays once per user. "Seen" is stored on the Firestore profile
 * (introVersionSeen), so it follows the user across devices. It's recorded on
 * the last step's buttons or Skip, not on open, so closing the app halfway
 * replays it. Profile → Help → App tour replays it any time.
 *
 * The start decision waits for Firestore to answer: the profile cached in
 * localStorage can be stale, and would otherwise flash the tour at someone
 * who already finished it on another device.
 *
 * Rendered inside RootLayout so it can switch pages with the router.
 */
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useUIStore, useUserStore } from "@/stores";
import { LOCAL_MODE } from "@/firebase/localMode";
import { useMealReminderSwitch } from "@/hooks/useMealReminderSwitch";
import { isIOS } from "@/hooks/useInstallPrompt";
import { INTRO_VERSION, WELCOME, REMINDERS, TOUR_STEPS } from "./tourSteps";

/** Space between the highlighted element and the edge of the spotlight. */
const SPOT_PAD = 6;
/** Space between the spotlight and the tooltip. */
const TIP_GAP = 12;
/** Minimum space between the tooltip and the screen edge. */
const EDGE = 16;
/** How long to wait for a step's element to appear before skipping the step. */
const TARGET_TIMEOUT_MS = 1500;
/** How long the highlights take to glide to the next step (and along the tab bar). */
const GLIDE_MS = 420;
/** Page transition between tabs: the old page slides out, then the new one in. */
const PAGE_OUT_MS = 200;
const PAGE_IN_MS  = 380;
const PAGE_SLIDE_PX = 44;
const HIGHLIGHT_FADE = `opacity ${PAGE_OUT_MS}ms ease`;
/** The dimmed backdrop around the spotlight. */
const DIM = "rgba(5, 5, 12, 0.74)";
/** Only one tour overlay exists at a time, so a fixed id is safe. */
const MASK_ID = "intro-tour-mask";

interface Rect { top: number; left: number; width: number; height: number; }

/** What the overlay draws for the current step, eased between steps. */
interface Spot {
  pos: number;
  /** The highlighted element. */
  rect: Rect;
  /** The tab the user is on (its bottom-nav button), or null off the tabs. */
  tab: Rect | null;
  /** That tab's name, e.g. "Menu". */
  tabLabel: string;
  /** The highlighted element is that tab's button, so only one ring is drawn. */
  tabIsTarget: boolean;
  /** The glide has finished, so the tooltip can appear. */
  settled: boolean;
}

export default function IntroTour() {
  const isOpen           = useUIStore((s) => s.isTourOpen);
  const openTour         = useUIStore((s) => s.openTour);
  const introVersionSeen = useUserStore((s) => s.introVersionSeen);
  const profileStatus    = useUserStore((s) => s.profileStatus);

  // Local mode never asks Firestore, so its saved profile is the whole truth
  const profileKnown = LOCAL_MODE || profileStatus === "ready";

  useEffect(() => {
    if (profileKnown && introVersionSeen < INTRO_VERSION) openTour();
  }, [profileKnown, introVersionSeen, openTour]);

  return isOpen ? createPortal(<TourOverlay />, document.body) : null;
}

/** pos 0 = welcome card, 1…N = spotlight steps; N is the meal reminders step. */
function TourOverlay() {
  const navigate      = useNavigate();
  const { pathname }  = useLocation();
  const closeTour     = useUIStore((s) => s.closeTour);
  const markIntroSeen = useUserStore((s) => s.markIntroSeen);
  const firstName     = useUserStore((s) => s.userProfile?.name.trim().split(/\s+/)[0] ?? "");

  const [pos, setPos]   = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [tipH, setTipH] = useState(180);
  const [, rerender]    = useReducer((n: number) => n + 1, 0);
  /** The old page is sliding out: its highlight fades with it. */
  const [pageLeaving, setPageLeaving] = useState(false);
  const reminders       = useMealReminderSwitch();
  const [reminderFailed, setReminderFailed] = useState(false);

  const direction  = useRef<1 | -1>(1);
  const startPath  = useRef(pathname);
  const tipRef     = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const tipHRef    = useRef(tipH); // latest height, for the scroll in the tracking loop
  tipHRef.current  = tipH;
  /** Where the highlights are drawn right now; the next step glides from here. */
  const shown      = useRef<{ rect: Rect | null; tab: Rect | null }>({ rect: null, tab: null });
  /** Index of the open tab just before the tour switched pages; null if it didn't. */
  const tabBefore  = useRef<number | null>(null);
  /** Which side the tooltip slides in from: −1 left, 1 right, 0 rises (same tab). */
  const enterFrom  = useRef<-1 | 0 | 1>(0);
  /** The old page's slide-out, held at its end until the new page slides in. */
  const pageOut    = useRef<Animation | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ending     = useRef(false);

  const step   = pos >= 1 ? TOUR_STEPS[pos - 1] ?? null : null;
  const isLast = pos === TOUR_STEPS.length;
  const ready  = !step || (spot?.pos === pos && spot.settled);
  const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function go(delta: 1 | -1) {
    direction.current = delta;
    setPos((p) => Math.min(Math.max(p + delta, 0), TOUR_STEPS.length));
  }

  function finish(route: string) {
    markIntroSeen(INTRO_VERSION);
    closeTour();
    if (pathname !== route) navigate(route);
  }

  /** Skip leaves the user where they started (e.g. Profile, after a replay). */
  const skip = () => finish(startPath.current);

  /** "Done" on the last step: the overlay fades as the page slides over to Today. */
  function finishAtHome() {
    if (ending.current) return;
    ending.current = true;
    const dir = tabDirection(activeTabIndex(), tabIndexOf("/"));
    if (!motion || !dir) {
      finish("/");
      return;
    }
    overlayRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PAGE_OUT_MS, fill: "forwards" });
    const out = slidePage("out", dir);
    out.finished.catch(() => {}).then(() => {
      finish("/");
      slidePage("in", dir);
      out.cancel();
    });
  }

  // ── Meal reminders step: what this device allows decides the words and buttons
  const reminderView =
    reminders.permission === "unsupported" ? (isIOS ? "installFirst" : "unsupported")
    : reminders.permission === "denied"    ? "blocked"
    : !reminders.enabled                   ? "offer"
    : reminders.permission === "granted"   ? "on"
    : "allowHere";
  const reminderCopy = REMINDERS[reminderView];
  const reminderCta  = "cta" in reminderCopy ? reminderCopy : null;

  /** Must run straight from the tap: the browser only asks for permission then. */
  async function turnOnReminders() {
    setReminderFailed(false);
    const result = await (reminderView === "offer" ? reminders.turnOn() : reminders.allowOnThisDevice());
    // "ok" and "denied" show themselves: the step switches to "on" or "blocked"
    if (result === "failed") setReminderFailed(true);
  }

  // ── Open the step's tab, find its element and keep the spotlight on it ────
  // Tracked every frame while the step shows, so the spotlight follows smooth
  // scrolling, page entrance animations and content that loads late.
  useEffect(() => {
    if (!step) {
      shown.current = { rect: null, tab: null };
      setSpot(null);
      return;
    }

    // A step that opens a tab checks the tab exists first (e.g. a tab this user doesn't have)
    if (step.requires && !document.querySelector(`[data-tour="${step.requires}"]`)) {
      go(direction.current);
      return;
    }
    if (step.route && pathname !== step.route) {
      const route = step.route;
      tabBefore.current = activeTabIndex();
      const dir = tabDirection(tabBefore.current, tabIndexOf(route));
      if (!motion || !dir) {
        navigate(route);
        return; // runs again once the new page is showing
      }
      // Slide the old page out first, then open the new one. The highlight
      // fades out with it and fades in on the new page's element, rather than
      // gliding across a page that's changing under it.
      setPageLeaving(true);
      shown.current = { rect: null, tab: shown.current.tab };
      let navigated = false;
      const out = slidePage("out", dir);
      pageOut.current = out;
      out.finished.then(() => { navigated = true; navigate(route); }, () => {});
      return () => { if (!navigated) out.cancel(); };
    }

    // ── Just switched tabs: slide the new page in, pop the tab when the glide reaches it
    enterFrom.current = 0;
    if (tabBefore.current !== null) {
      const after = activeTabIndex();
      enterFrom.current = tabDirection(tabBefore.current, after);
      tabBefore.current = null;
      if (motion) {
        if (enterFrom.current) slidePage("in", enterFrom.current);
        else document.querySelector("main")?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
        // The slide-in has taken over from the held slide-out
        pageOut.current?.cancel();
        pageOut.current = null;
        activeTab()?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
          { duration: 380, delay: GLIDE_MS - 120, easing: "ease-out" },
        );
      }
    }

    const from    = shown.current;
    const started = performance.now();
    let glideStart = 0;
    let frame = 0;

    const track = (now: number) => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el && el.getClientRects().length > 0) {
        if (!glideStart) {
          glideStart = now;
          setPageLeaving(false);
          scrollIntoPlace(el, tipHRef.current, motion);
        }

        const tabEl  = activeTab();
        const target = rectOf(el);
        const tab    = tabEl ? rectOf(tabEl) : null;

        // Glide from where the highlights were towards where the elements are
        // now (they may still be moving while the page scrolls). After a page
        // change only the tab glides; the highlight fades in where it lands,
        // and the tooltip waits for the glide, which outlasts the page slide-in.
        const t = motion && (from.rect || from.tab) ? Math.min((now - glideStart) / GLIDE_MS, 1) : 1;
        const e = easeInOutCubic(t);
        const next = {
          rect: from.rect ? lerpRect(from.rect, target, e) : target,
          tab:  tab && from.tab ? lerpRect(from.tab, tab, e) : tab,
        };
        shown.current = next;

        const tabLabel    = tabEl?.innerText.trim() ?? "";
        const tabIsTarget = !!tabEl && (tabEl === el || tabEl.contains(el) || el.contains(tabEl));
        const settled     = t >= 1;
        setSpot((prev) =>
          prev && prev.pos === pos && prev.settled === settled
            && prev.tabLabel === tabLabel && prev.tabIsTarget === tabIsTarget
            && sameRect(prev.rect, next.rect) && sameRect(prev.tab, next.tab)
            ? prev
            : { pos, ...next, tabLabel, tabIsTarget, settled },
        );
      } else if (now - started > TARGET_TIMEOUT_MS) {
        // Not on screen: skip it in whichever direction the user is moving
        go(direction.current);
        return;
      }
      frame = requestAnimationFrame(track);
    };

    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, pathname]);

  // Re-place the tooltip when the screen rotates or resizes
  useEffect(() => {
    window.addEventListener("resize", rerender);
    return () => window.removeEventListener("resize", rerender);
  }, []);

  // Measure the tooltip so it can sit above the spotlight when there's no room below
  useLayoutEffect(() => {
    const h = tipRef.current?.offsetHeight;
    if (h && h !== tipH) setTipH(h);
  });

  // Tooltip entrance: slides in from the side the tour moved towards after a
  // tab switch, otherwise rises into place
  useLayoutEffect(() => {
    if (!motion || !step || !ready) return;
    const dx = enterFrom.current * 32;
    tipRef.current?.animate(
      [
        { opacity: 0, transform: dx ? `translateX(${dx}px)` : "translateY(12px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: dx ? 340 : 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, ready]);

  // Keyboard: Esc skips, arrows step through; focus follows the main button
  useEffect(() => {
    if (!ready) return;
    primaryRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" && pos < TOUR_STEPS.length) go(1);
      else if (e.key === "ArrowLeft" && pos > 0) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, ready, pathname]);

  // ── Layout ────────────────────────────────────────────────────────────────
  const hole = spot && step ? {
    top:    spot.rect.top - SPOT_PAD,
    left:   spot.rect.left - SPOT_PAD,
    width:  spot.rect.width + SPOT_PAD * 2,
    height: spot.rect.height + SPOT_PAD * 2,
  } : null;
  const tabHole = spot && step ? spot.tab : null;

  let tipPosition: CSSProperties = {};
  if (hole) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(340, vw - EDGE * 2);
    const left  = Math.min(Math.max(hole.left + hole.width / 2 - width / 2, EDGE), vw - width - EDGE);
    const below = hole.top + hole.height + TIP_GAP;
    const above = hole.top - TIP_GAP - tipH;
    // Below if it fits, else above, else pinned to the bottom of the screen
    const top = below + tipH <= vh - EDGE ? below : above >= EDGE ? above : vh - tipH - EDGE;
    tipPosition = { top, left, width };
  }

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="tour-title" style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
      {/* Shield: the app can't be tapped mid-tour */}
      <div aria-hidden style={{ position: "fixed", inset: 0, touchAction: "none" }} />

      {/* Dimmed backdrop, with clear holes over the highlighted element and the open tab */}
      <svg aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <mask id={MASK_ID}>
            <rect width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx={14} fill="black" style={{ opacity: pageLeaving ? 0 : 1, transition: HIGHLIGHT_FADE }} />}
            {tabHole && <rect x={tabHole.left} y={tabHole.top} width={tabHole.width} height={tabHole.height} rx={12} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={DIM} mask={`url(#${MASK_ID})`} />
      </svg>

      {/* Open tab: a quiet outline, so it's clear which page the tour is on */}
      {tabHole && !spot?.tabIsTarget && (
        <div aria-hidden style={{
          position: "fixed", ...tabHole,
          borderRadius: 12,
          boxShadow: "0 0 0 1.5px rgba(255,255,255,0.55)",
          pointerEvents: "none",
        }} />
      )}

      {/* Highlighted element: teal ring with a glow */}
      {hole && (
        <div aria-hidden style={{
          position: "fixed", ...hole,
          borderRadius: 14,
          boxShadow: "0 0 0 2px var(--color-primary-light), 0 0 24px 4px rgba(20,160,133,0.45)",
          pointerEvents: "none",
          opacity: pageLeaving ? 0 : 1, transition: HIGHLIGHT_FADE,
        }} />
      )}

      {/* ── Spotlight step tooltip ── */}
      {step && hole && ready && (
        <div ref={tipRef} key={pos} style={{
          ...CARD, position: "fixed", ...tipPosition,
          padding: "0.9rem 1rem 0.85rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {spot?.tabLabel ? (
              <span style={TAB_CHIP}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                {spot.tabLabel} tab
              </span>
            ) : <span />}
            <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-3)", padding: isLast ? "0.25rem 0" : undefined }}>
                {pos} of {TOUR_STEPS.length}
              </span>
              {/* The last step's own buttons end the tour */}
              {!isLast && <button onClick={skip} style={TEXT_BUTTON}>Skip</button>}
            </div>
          </div>
          <h2 id="tour-title" style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.35rem" }}>
            {step.reminders ? reminderCopy.title : step.title}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-2)", lineHeight: 1.5, margin: 0 }}>
            {step.reminders ? reminderCopy.body : step.body}
          </p>
          {step.reminders && reminderFailed && (
            <p role="alert" style={{ fontSize: "0.78rem", color: "#ef4444", lineHeight: 1.45, margin: "0.5rem 0 0" }}>
              {REMINDERS.failed}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", marginTop: "0.9rem" }}>
            {step.reminders && reminderCta ? (
              <>
                <button onClick={() => go(-1)} style={{ ...TEXT_BUTTON, marginRight: "auto" }}>
                  Back
                </button>
                {/* "Not now" leaves them on Profile, next to the switch */}
                <button className="btn-ghost" onClick={() => finish(pathname)} disabled={reminders.busy} style={{ padding: "0.5rem 0.9rem", fontSize: "0.82rem" }}>
                  {reminderCta.decline}
                </button>
                <button ref={primaryRef} className="btn-primary" onClick={turnOnReminders} disabled={reminders.busy} style={{ padding: "0.5rem 1.1rem", fontSize: "0.82rem" }}>
                  {reminderCta.cta}
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => go(-1)} style={{ padding: "0.5rem 1rem", fontSize: "0.82rem" }}>
                  Back
                </button>
                {/* The last step's "Done" ends the tour on the Today page */}
                <button ref={primaryRef} className="btn-primary" onClick={isLast ? finishAtHome : () => go(1)} style={{ padding: "0.5rem 1.2rem", fontSize: "0.82rem" }}>
                  {isLast ? REMINDERS.done : "Next"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Welcome card ── */}
      {!step && (
        <div style={{
          position: "fixed", inset: 0, padding: EDGE,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div key={pos} style={{
            ...CARD, width: "100%", maxWidth: 360,
            padding: "1.75rem 1.5rem 1.1rem", textAlign: "center",
            pointerEvents: "auto",
            animation: motion ? "fade-up 0.35s ease both" : undefined,
          }}>
            <img src={WELCOME.photo} alt={WELCOME.author} style={{
              width: 84, height: 84, borderRadius: "50%", objectFit: "cover",
              border: "3px solid var(--color-primary)",
              boxShadow: "0 4px 16px rgba(20,160,133,0.35)",
              margin: "0 auto 1rem",
            }} />
            <h2 id="tour-title" style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 0.6rem" }}>
              {firstName ? `Hey ${firstName}, I'm ${WELCOME.author} 👋` : `Hey, I'm ${WELCOME.author} 👋`}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-2)", lineHeight: 1.55, margin: "0 0 1.4rem" }}>
              {WELCOME.message}
            </p>
            <button ref={primaryRef} className="btn-primary" onClick={() => go(1)} style={{ width: "100%", padding: "0.85rem" }}>
              Show me around
            </button>
            <button onClick={skip} style={{ ...TEXT_BUTTON, display: "block", width: "100%", marginTop: "0.6rem", padding: "0.5rem" }}>
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CARD: CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border-2)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
  color: "var(--color-text-1)",
};

const TEXT_BUTTON: CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--color-text-3)", fontSize: "0.8rem", fontWeight: 600,
  padding: "0.25rem 0.4rem",
};

const TAB_CHIP: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.35rem",
  padding: "0.2rem 0.6rem",
  borderRadius: "var(--radius-full)",
  background: "var(--color-primary-ghost)",
  color: "var(--color-primary-light)",
  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.03em",
};

/** The bottom-nav button of the page that's open (NavLink marks it aria-current). */
function activeTab(): HTMLElement | null {
  return document.querySelector<HTMLElement>('nav a[aria-current="page"]');
}

/** Position of the open tab in the bottom nav, or −1 off the tabs. */
function activeTabIndex(): number {
  const tab = activeTab();
  return tab ? Array.from(document.querySelectorAll("nav a")).indexOf(tab) : -1;
}

/** Position in the bottom nav of the tab that opens `route`, or −1. */
function tabIndexOf(route: string): number {
  return Array.from(document.querySelectorAll("nav a")).findIndex((a) => a.getAttribute("href") === route);
}

/** 1 when moving to a tab on the right, −1 to the left, 0 if either isn't a tab. */
function tabDirection(from: number, to: number): -1 | 0 | 1 {
  if (from < 0 || to < 0 || from === to) return 0;
  return to > from ? 1 : -1;
}

/**
 * Slides the page area out towards the side away from `dir`, or in from the
 * side of `dir`. Moves it with `left`, not a transform: a transform would
 * become the frame for fixed elements inside the page (the Log page's
 * buttons) and drag them along. The slide-out holds its end state so the old
 * page stays hidden until the new one slides in.
 */
function slidePage(phase: "out" | "in", dir: 1 | -1): Animation {
  const main = document.querySelector<HTMLElement>("main")!;
  main.style.position = "relative";
  if (phase === "out") {
    return main.animate(
      [{ opacity: 1, left: "0px" }, { opacity: 0, left: `${-dir * PAGE_SLIDE_PX}px` }],
      { duration: PAGE_OUT_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
  }
  const anim = main.animate(
    [{ opacity: 0, left: `${dir * PAGE_SLIDE_PX}px` }, { opacity: 1, left: "0px" }],
    { duration: PAGE_IN_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  anim.finished.catch(() => {}).then(() => { main.style.position = ""; });
  return anim;
}

/**
 * Scrolls so the element and the tooltip under it sit centred as one block,
 * so the tooltip doesn't have to cover the element on short screens.
 * Fixed elements (bottom nav, Log buttons) don't move when scrolled.
 */
function scrollIntoPlace(el: HTMLElement, tipH: number, motion: boolean) {
  if (isFixed(el)) return;
  const r      = el.getBoundingClientRect();
  const blockH = r.height + SPOT_PAD * 2 + TIP_GAP + tipH;
  const top    = Math.max(EDGE, (window.innerHeight - blockH) / 2) + SPOT_PAD;
  window.scrollBy({ top: r.top - top, behavior: motion ? "smooth" : "auto" });
}

/** True if the element or one of its ancestors is position: fixed. */
function isFixed(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (getComputedStyle(node).position === "fixed") return true;
  }
  return false;
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return {
    top:    a.top + (b.top - a.top) * t,
    left:   a.left + (b.left - a.left) * t,
    width:  a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}
