export const tokens = {
  color: {
    background: "#ffffff",
    surface: "#f7f8f7",
    surfaceRaised: "#ffffff",
    text: "#171a18",
    textMuted: "#68706b",
    border: "#e1e5e2",
    accent: "#2f6f4e",
    accentSoft: "#e7f1eb",
    danger: "#b42318",
    warning: "#a15c00",
    success: "#237a4b",
  },
  typography: {
    fontSans: "Inter, ui-sans-serif, system-ui, sans-serif",
    size: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.5rem",
      display: "2.25rem",
    },
  },
  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    6: "1.5rem",
    8: "2rem",
    12: "3rem",
    16: "4rem",
  },
  radius: {
    sm: "0.375rem",
    md: "0.625rem",
    lg: "0.875rem",
    pill: "999px",
  },
  motion: {
    fast: "120ms",
    normal: "180ms",
    slow: "280ms",
  },
} as const;

export type ArqenTokens = typeof tokens;
