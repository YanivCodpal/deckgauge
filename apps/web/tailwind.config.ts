import type { Config } from "tailwindcss";

// Neutral scales + surfaces are driven by CSS variables (defined in globals.css)
// so the whole app flips light↔dark by toggling one `dark` class — existing
// `text-slate-*`, `bg-slate-*`, `border-slate-*`, `gray-*`, and `surface-*`
// utilities become theme-aware with no per-component edits. Accents (indigo,
// emerald, amber, red) and literal white/black stay fixed on purpose.
const varScale = (name: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [
      shade,
      `rgb(var(--${name}-${shade}) / <alpha-value>)`,
    ]),
  );

// Deckgauge brand accent ramp (Tailwind's "teal"). The app historically used the
// built-in indigo/violet/purple utilities as its accent; remapping those keys to
// this ramp retints every indigo-*/violet-*/purple-* utility across the app to the
// brand teal with no per-component edits.
const BRAND_TEAL = {
  50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4",
  400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e",
  800: "#115e59", 900: "#134e4a", 950: "#042f2e",
};

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: varScale("slate"),
        gray: varScale("gray"),
        indigo: BRAND_TEAL,
        violet: BRAND_TEAL,
        purple: BRAND_TEAL,
        fuchsia: BRAND_TEAL,
        "surface-0": "rgb(var(--surface-0) / <alpha-value>)",
        "surface-1": "rgb(var(--surface-1) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "status-not-started-bg": "#c4c4c4",
        "status-not-started-text": "#ffffff",
        "status-in-progress-bg": "#fdab3d",
        "status-in-progress-text": "#ffffff",
        "status-at-risk-bg": "#e44258",
        "status-at-risk-text": "#ffffff",
        "status-blocked-bg": "#e2445c",
        "status-blocked-text": "#ffffff",
        "status-done-bg": "#00c875",
        "status-done-text": "#ffffff",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06)",
        dropdown: "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "flash-error": "flashError 0.4s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideInRight: { "0%": { transform: "translateX(100%)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        flashError: {
          "0%": { backgroundColor: "rgba(239, 68, 68, 0)" },
          "30%": { backgroundColor: "rgba(239, 68, 68, 0.25)" },
          "100%": { backgroundColor: "rgba(239, 68, 68, 0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
