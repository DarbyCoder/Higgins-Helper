import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
// Start listening for the browser's install prompt before any page mounts
import "./hooks/useInstallPrompt.ts";
import App from "./App.tsx";
import "./index.css";

// Register the service worker
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
