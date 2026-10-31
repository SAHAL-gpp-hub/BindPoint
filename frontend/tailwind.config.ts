import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F9F8F6",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F2EFE9",
          muted: "#EBE7DF",
        },
        ink: {
          DEFAULT: "#1C1E1B",
          secondary: "#525650",
          muted: "#868A82",
        },
        accent: {
          DEFAULT: "#144A38",
          hover: "#0E382A",
          subtle: "#EAF2EE",
        },
        line: {
          DEFAULT: "#E4DFD5",
          dark: "#D1CBC0",
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
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
