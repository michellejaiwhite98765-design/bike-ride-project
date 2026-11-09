import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import { useTranslation } from "react-i18next";
import { RTL_LANGUAGES } from "./i18n/languages.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";
import "./i18n/index.js";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.jsx";
import { getAntdTheme } from "./theme/theme.js";
import BikeSpinner from "./components/ui/BikeSpinner.jsx";

// Every antd loading state (buttons, Spin, tables, selects) shows the bike loader.
const bike = <BikeSpinner />;

function ThemedApp() {
  const { mode } = useTheme();
  const { i18n } = useTranslation();
  return (
    <ConfigProvider theme={getAntdTheme(mode)} direction={RTL_LANGUAGES.includes(i18n.language) ? "rtl" : "ltr"} button={{ loadingIcon: bike }} spin={{ indicator: bike }} select={{ loadingIcon: bike }}>
      <AntdApp notification={{ placement: "topRight", top: 84, duration: 4, maxCount: 3 }}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

// Replace Leaflet's own "Leaflet" flag credit on every map with the app name.
// The OpenStreetMap credit next to it stays: the map data licence requires it.
L.Control.Attribution.prototype.options.prefix = "Liftshare";

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
