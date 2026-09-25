// BikeRide Design System - Colors
// Backed by CSS custom properties (see src/index.css :root / [data-theme="light"])
// so every consumer - styled-components template literals and plain CSS alike -
// repaints automatically when the theme toggles, with no React re-render needed.

export const colors = {
  // Primary brand color (constant across themes - teal is the brand identity)
  primary: "#2DD4BF",
  primaryLight: "#5EEAD4",
  primaryDark: "#14B8A6",

  // Backgrounds
  bgPrimary: "var(--bg-primary)",
  bgSecondary: "var(--bg-secondary)",
  bgTertiary: "var(--bg-tertiary)",
  bgOverlay: "var(--bg-overlay)",

  // Text colors
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textTertiary: "var(--text-tertiary)",
  textInverse: "var(--text-inverse)",

  // Semantic colors
  success: "var(--color-success)",
  successLight: "var(--color-success-light)",
  warning: "var(--color-warning)",
  warningLight: "var(--color-warning-light)",
  error: "var(--color-error)",
  errorLight: "var(--color-error-light)",
  info: "var(--color-info)",
  infoLight: "var(--color-info-light)",

  // Borders and dividers
  border: "var(--border)",
  borderLight: "var(--border-light)",
  divider: "var(--divider)",

  // Status colors for rides (constant across themes)
  statusPublished: "var(--status-published)",
  statusStarted: "var(--status-started)",
  statusCompleted: "var(--status-completed)",
  statusCancelled: "var(--status-cancelled)",

  // Shadows
  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
  shadowLg: "var(--shadow-lg)",
  shadowXl: "var(--shadow-xl)",
};

export default colors;
