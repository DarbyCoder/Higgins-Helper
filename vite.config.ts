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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,woff2}"],
        // iOS fetches its launch screens itself, once, when the app is installed
        globIgnores: ["splash/**"],
        // Load our custom push/notification-click handlers into the generated SW
        importScripts: ["/sw-handlers.js"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/menu/,
            handler: "NetworkFirst",
            options: { cacheName: "api-menu-cache" },
          },
        ],
      },
      manifest: false, // We provide our own manifest.json in public/
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        // React and Firebase in files of their own: they change far less often
        // than the app, so after an app update phones keep the cached copies
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react";
          if (/node_modules\/(firebase|@firebase|re2js|idb|tslib)\//.test(id)) return "firebase";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently drifting to 5174+.
    // A drifted port leaves the app talking to a stale server on the real one,
    // which is far more confusing than a startup error.
    strictPort: true,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
