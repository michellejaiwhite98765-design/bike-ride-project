import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "bikeride_theme_mode";
const ThemeContext = createContext(null);

function getInitialMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) - fall back to dark.
  }
  return "dark";
}

export function ThemeProvider({ children }) {
  // The user's chosen theme (saved), and a page-level override: the login and
  // register screens are designed dark-only, so they force dark while open.
  const [preferred, setMode] = useState(getInitialMode);
  const [forceDark, setForceDark] = useState(0);
  const mode = forceDark > 0 ? "dark" : preferred;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preferred);
    } catch {
      // Ignore write failures - the toggle still works for this session.
    }
  }, [preferred]);

  const toggleTheme = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return <ThemeContext.Provider value={{ mode, toggleTheme, setForceDark, forcedDark: forceDark > 0 }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** Keep the page dark while it's open, whatever theme the user picked. */
export function useForceDark() {
  const { setForceDark } = useTheme();
  useEffect(() => {
    setForceDark((n) => n + 1);
    return () => setForceDark((n) => n - 1);
  }, [setForceDark]);
}
