/**
 * @file src/App.tsx
 * @description Root application component. Sets up routing, store initialization,
 * the persistent bottom navigation shell, and Firebase Auth + Firestore sync.
 */
import { lazy, Suspense, useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from "react-router-dom";
import { useFoodLogStore, useThemeStore } from "@/stores";
import { AuthProvider } from "@/firebase/AuthProvider";
import AuthGate from "@/components/auth/AuthGate";
import { useFirestoreSync } from "@/hooks/useFirestoreSync";
import { useMealReminders } from "@/hooks/useMealReminders";
import IntroTour from "@/components/tour/IntroTour";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";

// Today ships with the app; every other page is its own file, loaded the first
// time it's needed. Once the app is idle they're all fetched in the background,
// so switching tabs never waits.
const loadMenu      = () => import("@/pages/MenuPage");
const loadLog       = () => import("@/pages/LogPage");
const loadProfile   = () => import("@/pages/ProfilePage");
const loadAddFood   = () => import("@/pages/AddFoodPage");
const loadScanOrder = () => import("@/pages/ScanOrderPage");
const MenuPage      = lazy(loadMenu);
const LogPage       = lazy(loadLog);
const ProfilePage   = lazy(loadProfile);
const AddFoodPage   = lazy(loadAddFood);
const ScanOrderPage = lazy(loadScanOrder);

function prefetchPages() {
  const run = () => {
    for (const load of [loadMenu, loadLog, loadProfile, loadAddFood, loadScanOrder]) {
      load().catch(() => {}); // offline before the service worker cached them; tried again on use
    }
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

/**
 * Root layout — wraps all pages with AppShell (header + bottom nav).
 * Also kicks off Firestore hydration + real-time sync for the signed-in user.
 */
function RootLayout() {
  const pruneOldLogs = useFoodLogStore((s) => s.pruneOldLogs);
  const applyTheme   = useThemeStore((s) => s.applyTheme);

  useEffect(() => {
    // Apply persisted theme to DOM on every app launch (prevents flash)
    applyTheme();
    // Prune food log entries older than 90 days
    pruneOldLogs();
    prefetchPages();
  }, [applyTheme, pruneOldLogs]);

  // Fix #17 & #22: Schedule meal reminders and check for unlogged meals
  useMealReminders();

  return (
    <AppShell>
      {/* Navigations run as transitions, so the old page stays up while a new one loads */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
      {/* Plays once per user on launch; replayable from Profile */}
      <IntroTour />
    </AppShell>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true,         element: <DashboardPage /> },
      { path: "menu",        element: <MenuPage />      },
      { path: "log",         element: <LogPage />       },
      { path: "add-food",    element: <AddFoodPage />   },
      { path: "scan-order",  element: <ScanOrderPage /> },
      { path: "profile",     element: <ProfilePage />   },
    ],
  },
]);

export default function App() {
  // Hydrate all stores from Firestore and set up real-time listeners.
  // Must sit outside AuthGate: AuthGate waits on the profile this loads.
  useFirestoreSync();

  return (
    <AuthProvider>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </AuthProvider>
  );
}
