import type { Config } from "tailwindcss";

// Design direction: a public-health platform for rural India — calm,
// trustworthy, high-legibility. A deep teal (clinical trust, not
// sterile-white) paired with a warm marigold accent (used sparingly,
// nods to the everyday palette of Indian signage) on a soft warm-grey
// field. Flat surfaces with hairline borders instead of drop shadows —
// this needs to stay readable on cheap rural-area phone screens, where
// soft grey shadows tend to just look muddy.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152722",
        teal: {
          50: "#EAF3F1",
          100: "#CFE4DF",
          400: "#2E7C71",
          500: "#166A61",
          600: "#0F4C46",
          700: "#0B3934",
          900: "#082622",
        },
        marigold: {
          400: "#E3B65A",
          500: "#D9A441",
          600: "#C08F2E",
        },
        sage: {
          50: "#FAFBFA",
          100: "#F3F6F4",
          200: "#E4EAE6",
        },
        line: "#DDE5E1",
        success: "#3F8F5F",
        danger: "#B3432B",
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
