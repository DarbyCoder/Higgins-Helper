/**
 * @file src/App.tsx
 * @description Root application component. Sets up routing, store initialization,
 * the persistent bottom navigation shell, and Firebase Auth + Firestore sync.
 */
import { useEffect } from "react";
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
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import MenuPage from "@/pages/MenuPage";
import LogPage from "@/pages/LogPage";
import AIPage from "@/pages/AIPage";
import ProfilePage from "@/pages/ProfilePage";
import AddFoodPage from "@/pages/AddFoodPage";
import AddDrinkPage from "@/pages/AddDrinkPage";

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
  }, [applyTheme, pruneOldLogs]);

  // Fix #17 & #22: Schedule meal reminders and check for unlogged meals
  useMealReminders();

  return (
    <AppShell>
      <Outlet />
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
      { path: "add-drink",   element: <AddDrinkPage />  },
      { path: "ai",          element: <AIPage />        },
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
