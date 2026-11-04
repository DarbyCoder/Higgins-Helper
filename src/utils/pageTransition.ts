/**
 * @file src/utils/pageTransition.ts
 * @description The sideways page slide between tabs, shared by normal tab
 * switches (AppShell) and the intro tour. The page slides in from the side of
 * the tab it's going to, like a carousel.
 *
 * Moves <main> with `left`, not a transform: a transform would become the
 * frame for fixed elements inside the page (the Log page's buttons) and drag
 * them along.
 */

export const PAGE_OUT_MS = 200;
export const PAGE_IN_MS  = 380;
const SLIDE_PX = 44;

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The bottom-nav button of the page that's open (NavLink marks it aria-current). */
export function activeTab(): HTMLElement | null {
  return document.querySelector<HTMLElement>('nav a[aria-current="page"]');
}

/** Position of the open tab in the bottom nav, or −1 off the tabs. */
export function activeTabIndex(): number {
  const tab = activeTab();
  return tab ? Array.from(document.querySelectorAll("nav a")).indexOf(tab) : -1;
}

/** Position in the bottom nav of the tab that opens `route`, or −1. */
export function tabIndexOf(route: string): number {
  return Array.from(document.querySelectorAll("nav a")).findIndex((a) => a.getAttribute("href") === route);
}

/** 1 when moving to a tab on the right, −1 to the left, 0 if either isn't a tab. */
export function tabDirection(from: number, to: number): -1 | 0 | 1 {
  if (from < 0 || to < 0 || from === to) return 0;
  return to > from ? 1 : -1;
}

/**
 * Slides the page area out towards the side away from `dir`, or in from the
 * side of `dir`. The slide-out holds its end state so the old page stays
 * hidden until the new one slides in (cancel it then).
 */
export function slidePage(phase: "out" | "in", dir: 1 | -1): Animation {
  const main = document.querySelector<HTMLElement>("main")!;
  main.style.position = "relative";
  if (phase === "out") {
    return main.animate(
      [{ opacity: 1, left: "0px" }, { opacity: 0, left: `${-dir * SLIDE_PX}px` }],
      { duration: PAGE_OUT_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
  }
  const anim = main.animate(
    [{ opacity: 0, left: `${dir * SLIDE_PX}px` }, { opacity: 1, left: "0px" }],
    { duration: PAGE_IN_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  anim.finished.catch(() => {}).then(() => { main.style.position = ""; });
  return anim;
}
