/**
 * @file src/components/tour/tourSteps.ts
 * @description Content of the intro tour: the personal welcome card, the
 * spotlight steps and the closing card. Edit the words here; the overlay in
 * IntroTour.tsx only handles layout and behaviour.
 *
 * Each spotlight step points at an element tagged `data-tour="<target>"`.
 * A step whose target isn't on screen is skipped. A step that opens a tab can
 * list the tab's nav button under `requires`, so it's skipped (without opening
 * the page) for users who don't have that tab.
 */

/**
 * Bump this to show the tour again to everyone — e.g. after adding a big
 * feature and a step about it. Users who saw an older version get it once more.
 */
export const INTRO_VERSION = 1;

export const WELCOME = {
  /** Square photo shown in a circle. Drop yours in public/intro/ and point this at it. */
  photo: "/logo-square.jpg",
  author: "Nick",
  message:
    "I built Higgins Helper so you can see exactly what's in the food at Higgins " +
    "and The Bistro, and keep track of it without the guesswork. Here's a quick " +
    "look around. It takes about 30 seconds.",
};

export const DONE = {
  title: "You're all set 🎉",
  message:
    "Start by finding something good on today's menu. Tap the logo any time to " +
    "see this tour again.",
  cta: "Browse today's menu",
  ctaRoute: "/menu",
};

export interface TourStep {
  /** Matches a `data-tour` attribute in the app. */
  target: string;
  /** Page to open before highlighting. Omit to stay on the current page (the header and nav are on every page). */
  route?: string;
  /** Skip the step, before opening `route`, unless this `data-tour` element is on screen. */
  requires?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: "today-summary",
    route: "/",
    title: "Your day at a glance",
    body:
      "The ring fills up as you log food, and the bars below track protein, carbs, " +
      "fat and fiber. Your targets are worked out from your profile.",
  },
  {
    target: "date-picker",
    route: "/",
    title: "Any day, not just today",
    body: "Tap a day to look back at what you ate, or to log a meal you forgot.",
  },
  {
    target: "menu-controls",
    route: "/menu",
    title: "What's being served",
    body:
      "Today's Higgins and Bistro menus, with full nutrition for every dish. Search " +
      "or filter by diet, tap a dish to add it to your log, or switch to Worcester " +
      "for restaurants near campus.",
  },
  {
    target: "log-actions",
    route: "/log",
    title: "Your food log",
    body:
      "Everything you've eaten, grouped by meal. Use + and − to change servings or " +
      "swipe an entry left to delete it. Ordered from The Bistro? Scan your Grubhub " +
      "screenshot to log it. Ate off campus? Add a custom food or scan a barcode.",
  },
  {
    target: "nav-profile",
    route: "/profile",
    title: "Make it yours",
    body:
      "Change your goals, set your own macro targets, turn on meal reminders or " +
      "switch to light mode.",
  },
  {
    target: "header-logo",
    title: "Need a refresher?",
    body: "Tap the Higgins Helper logo at the top of any page to replay this tour.",
  },
];
