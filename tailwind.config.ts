import type { Config } from "tailwindcss";

// Design direction: a public-health platform for rural India — calm,
// trustworthy, high-legibility. A deep teal (clinical trust, not
// sterile-white) paired with a warm marigold accent (used sparingly,
// nods to the everyday palette of Indian signage) on a soft warm-grey
// field. Flat surfaces with hairline borders instead of drop shadows —
// this needs to stay readable on cheap rural-area phone screens, where
// soft grey shadows tend to just look muddy.
//
// Every colour is a CSS variable holding RGB channels (app/globals.css),
// so the same classes render the light palette by default and the dark
// palette under <html class="dark">, and opacity modifiers such as
// text-ink/70 or bg-danger/10 keep working in both.
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: token("ink"),
        // Always-dark text for use on the marigold accent in both themes.
        "ink-fixed": "#152722",
        // Cards, inputs, headers - white in light mode.
        surface: token("surface"),
        // Dashboard sidebar and the landing hero: dark teal fills that
        // carry white text.
        nav: token("nav"),
        hero: token("hero"),
        // Filled buttons with white text. Kept separate from teal-600,
        // which is mostly used as link/number text and has to brighten in
        // dark mode instead.
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
        },
        "danger-solid": token("danger-solid"),
        teal: {
          50: token("teal-50"),
          100: token("teal-100"),
          400: token("teal-400"),
          500: token("teal-500"),
          600: token("teal-600"),
          700: token("teal-700"),
          900: token("teal-900"),
        },
        marigold: {
          300: token("marigold-300"),
          400: token("marigold-400"),
          500: token("marigold-500"),
          600: token("marigold-600"),
        },
        sage: {
          50: token("sage-50"),
          100: token("sage-100"),
          200: token("sage-200"),
        },
        line: token("line"),
        success: token("success"),
        danger: token("danger"),
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
