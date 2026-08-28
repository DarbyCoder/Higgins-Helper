import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // generateSW: Workbox auto-generates the precaching SW — no source file
      // scanning, no swSrc/swDest path conflicts.
      // Push and notificationclick handlers live in public/sw-handlers.js and
      // are pulled into the generated SW via importScripts at runtime.
      strategies: "generateSW",
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg}"],
        // Load our custom push/notification-click handlers into the generated SW
        importScripts: ["/sw-handlers.js"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/menu/,
            handler: "NetworkFirst",
            options: { cacheName: "api-menu-cache" },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-cache" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 31_536_000 },
            },
          },
        ],
      },
      manifest: false, // We provide our own manifest.json in public/
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
