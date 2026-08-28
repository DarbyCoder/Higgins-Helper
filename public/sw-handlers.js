/**
 * @file public/sw-handlers.js
 * @description Custom push notification and notification click handlers
 * for the Higgins Helper service worker.
 *
 * This file is loaded by the Workbox-generated service worker via importScripts()
 * (configured in vite.config.ts → workbox.importScripts). It runs inside the SW
 * context, so `self` is the ServiceWorkerGlobalScope.
 *
 * Why importScripts instead of injectManifest?
 *   The injectManifest strategy requires a custom source SW file that Vite
 *   processes during build. This creates fragile srcDir/swDest path conflicts.
 *   Using importScripts in generateSW is simpler: Workbox generates the
 *   precaching SW automatically, then pulls this file in at runtime.
 */

// ─── Push Event Handler ───────────────────────────────────────────────────────
// Fired when the server sends a Web Push message to this device.
// The app uses client-side setTimeout reminders, so this is a future-proof
// hook for when server-side push is added.

self.addEventListener("push", function (event) {
  var defaults = {
    title: "Higgins Helper 🥗",
    body: "Time to log a meal!",
    url: "/log",
  };

  var data = defaults;
  if (event.data) {
    try {
      data = Object.assign({}, defaults, event.data.json());
    } catch (_) {
      data = Object.assign({}, defaults, { body: event.data.text() });
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo-square.jpg",
      badge: "/logo-square.jpg",
      tag: "higgins-meal-reminder",
      renotify: true,
      data: { url: data.url || "/log" },
    })
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
// Fired when the user taps a notification shown by this SW.
// Focuses an existing app tab or opens a new one pointing to the reminder URL.

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "/log";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.indexOf(self.location.origin) !== -1 && "focus" in client) {
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
