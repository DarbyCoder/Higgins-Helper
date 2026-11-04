/**
 * @file src/components/tour/tourSteps.ts
 * @description Content of the intro tour: the personal welcome card, the
 * spotlight steps and the meal reminders step that ends it. Edit the words
 * here; the overlay in IntroTour.tsx only handles layout and behaviour.
 *
 * Each spotlight step points at an element tagged `data-tour="<target>"`.
 * A step whose target isn't on screen is skipped. A step that opens a tab can
 * list the tab's nav button under `requires`, so it's skipped (without opening
 * the page) for users who don't have that tab.
 *
 * The tour ends on the Notifications section of Profile, encouraging the user
 * to turn on meal reminders (REMINDERS).
 */

/**
 * Bump this to show the tour again to everyone — e.g. after adding a big
 * feature and a step about it. Users who saw an older version get it once more.
 */
export const INTRO_VERSION = 1;

export const WELCOME = {
  /** Square photo shown in a circle. Drop yours in public/intro/ and point this at it. */
  photo: "/icon.svg",
  author: "Nick",
  message:
    "I built Higgins Helper so you can see exactly what's in the food at Higgins " +
    "and The Bistro, and keep track of it without the guesswork. Here's a quick " +
    "look around. It takes about 30 seconds.",
};

/**
 * The last step: the Notifications section on Profile, with a button that
 * turns meal reminders on. The words change with what this device allows.
 */
export const REMINDERS = {
  /** Reminders are off and this device can ask. */
  offer: {
    title: "Don't forget to log 🔔",
    body:
      "Last thing: turn on meal reminders and you'll get a nudge at 8am, noon and " +
      "8pm Eastern, so a meal never slips by unlogged.",
    cta: "Turn on reminders",
    decline: "Not now",
  },
  /** On for the account, but this device hasn't allowed notifications yet. */
  allowHere: {
    title: "Get reminders here too 🔔",
    body:
      "Meal reminders are on for your account. Allow notifications so this device " +
      "gets them too.",
    cta: "Allow notifications",
    decline: "Not now",
  },
  /** Already on and allowed. */
  on: {
    title: "Reminders are on ✓",
    body: "You'll get a nudge at 8am, noon and 8pm Eastern. Turn them off here any time.",
  },
  /** The browser said no, now or before. */
  blocked: {
    title: "Notifications are blocked",
    body:
      "Your browser is blocking notifications for Higgins Helper. Allow them in its " +
      "settings, then flip this switch to get meal reminders.",
  },
  /** iPhone in Safari: no notifications until the app is on the home screen. */
  installFirst: {
    title: "Want meal reminders? 🔔",
    body:
      "On iPhone, add the app to your home screen first: in Safari, tap Share, then " +
      "Add to Home Screen. Open it from there and turn reminders on here.",
  },
  /** The browser can't show notifications at all. */
  unsupported: {
    title: "Meal reminders",
    body:
      "This browser can't show notifications. Open Higgins Helper on your phone to " +
      "get a nudge at 8am, noon and 8pm.",
  },
  failed: "Couldn't turn them on. Check your connection and try again.",
  done: "Done",
};

export interface TourStep {
  /** Matches a `data-tour` attribute in the app. */
  target: string;
  /** Page to open before highlighting. Omit to stay on the current page (the header and nav are on every page). */
  route?: string;
  /** Skip the step, before opening `route`, unless this `data-tour` element is on screen. */
  requires?: string;
  /** The meal reminders step: its words and buttons come from REMINDERS. */
  reminders?: boolean;
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
      "Change your goals, set your own macro targets or switch to light mode. " +
      "You can replay this tour from here too.",
  },
  {
    target: "notifications",
    route: "/profile",
    reminders: true,
    // Title and body come from REMINDERS, depending on what this device allows
    title: "",
    body: "",
  },
];
