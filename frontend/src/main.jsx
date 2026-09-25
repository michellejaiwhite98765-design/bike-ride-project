import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.jsx";
import { getAntdTheme } from "./theme/theme.js";

function ThemedApp() {
  const { mode } = useTheme();
  return (
    <ConfigProvider theme={getAntdTheme(mode)}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>
);

// Registers the app-shell service worker so BikeRide is installable
// (Add to Home Screen / desktop install) and still boots offline.
// Skipped in dev - Vite's own dev server + HMR shouldn't be cached.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement - failing silently
      // here just means the app behaves as a normal (non-installable) SPA.
    });
  });
}
