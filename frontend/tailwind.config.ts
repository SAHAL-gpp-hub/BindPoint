import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#F8FAF9",
          subtle: "#F1F5F3",
          dark: "#0F1713",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F4F6F4",
          muted: "#E8ECE9",
          card: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#0F1713",
          secondary: "#4A5550",
          muted: "#76827C",
          faint: "#A0ACA6",
        },
        accent: {
          DEFAULT: "#0F3D2E",
          hover: "#09291E",
          subtle: "#E6F0EB",
          light: "#185C46",
          glow: "rgba(15, 61, 46, 0.15)",
        },
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        line: {
          DEFAULT: "#E1E6E2",
          subtle: "#EDF1EE",
          dark: "#CFD6D1",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(15, 23, 19, 0.05)",
        card: "0 4px 20px -2px rgba(15, 23, 19, 0.06), 0 2px 6px -1px rgba(15, 23, 19, 0.04)",
        elevated: "0 10px 30px -4px rgba(15, 23, 19, 0.08), 0 4px 12px -2px rgba(15, 23, 19, 0.04)",
        glow: "0 0 20px rgba(15, 61, 46, 0.15)",
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
