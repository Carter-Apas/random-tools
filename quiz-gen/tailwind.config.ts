import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        shell: "rgb(var(--shell) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        hot: "rgb(var(--hot) / <alpha-value>)",
        cool: "rgb(var(--cool) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      boxShadow: {
        panel: "0 16px 36px rgba(24, 27, 33, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
