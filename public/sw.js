/**
 * @file public/sw.js
 * @description Custom Service Worker for Higgins Helper PWA.
 *
 * Fix #18: The default Workbox generateSW strategy does NOT add push or
 * notificationclick event listeners. This custom SW adds them so the app
 * can receive push messages and handle notification clicks correctly.
 *
 * This file is referenced by vite.config.ts via the `injectManifest` strategy,
 * which injects the Workbox precache manifest into this file at build time.
 * In development, it is served directly from /public/.
 *
 * Event handlers added:
 *   - push: displays a notification when the server sends a push message
 *   - notificationclick: focuses or opens the app when a notification is tapped
 */

// ─── Workbox Precache Injection ───────────────────────────────────────────────
// This line is replaced by the Workbox manifest at build time.
// It is intentionally left as a comment here for local dev compatibility.
// import { precacheAndRoute } from "workbox-precaching";
// precacheAndRoute(self.__WB_MANIFEST);

// ─── Push Event Handler ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = { title: "Higgins Helper 🥗", body: "Time to log a meal!", url: "/log" };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const { title, body, url } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo-square.jpg",
      badge: "/logo-square.jpg",
      tag: "higgins-meal-reminder",
      renotify: true,
      data: { url: url ?? "/log" },
    })
  );
});

// ─── Notification Click Handler ────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/log";

  event.waitUntil(
    // Try to focus an existing tab first, otherwise open a new one
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Notification Close Handler ────────────────────────────────────────────────

self.addEventListener("notificationclose", (_event) => {
  // Optional: log analytics or clean up state when user dismisses
});
