/**
 * @file src/App.tsx
 * @description Root application component. Sets up routing, store initialization,
 * and the persistent bottom navigation shell.
 */
import { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from "react-router-dom";
import { useFoodLogStore, useThemeStore } from "@/stores";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import MenuPage from "@/pages/MenuPage";
import LogPage from "@/pages/LogPage";
import AIPage from "@/pages/AIPage";
import ProfilePage from "@/pages/ProfilePage";
import AddFoodPage from "@/pages/AddFoodPage";

/** Root layout — wraps all pages with AppShell (header + bottom nav). */
function RootLayout() {
  const pruneOldLogs = useFoodLogStore((s) => s.pruneOldLogs);
  const applyTheme   = useThemeStore((s) => s.applyTheme);

  useEffect(() => {
    // Apply persisted theme to DOM on every app launch (prevents flash)
    applyTheme();
    // Prune food log entries older than 90 days
    pruneOldLogs();
  }, [applyTheme, pruneOldLogs]);

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
      { index: true, element: <DashboardPage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "log", element: <LogPage /> },
      { path: "add-food", element: <AddFoodPage /> },
      { path: "ai", element: <AIPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
