import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
// Start listening for the browser's install prompt before any page mounts
import "./hooks/useInstallPrompt.ts";
import App from "./App.tsx";
import { startAnalytics } from "./firebase/analytics";
import "./index.css";

// Register the service worker
registerSW({ immediate: true });

// Analytics loads after the app has drawn, so it never slows the first screen
window.addEventListener("load", () => {
  const start = () => void startAnalytics();
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 1500);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
