import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Courier New", "monospace"],
      },
      colors: {
        council: {
          bg: "#06060B",
          surface: "#0D0D14",
          "surface-elevated": "#14141F",
          border: "#1A1A2E",
          gold: "#C9A227",
          "gold-dim": "#8B7355",
          ember: "#D4663A",
          "text-primary": "#F0EDE6",
          "text-secondary": "#8A8A9A",
          "text-tertiary": "#4A4A5A",
        },
        agent: {
          rockefeller: "#059669",
          napoleon: "#DC2626",
          bismarck: "#64748B",
          walker: "#D97706",
          aurelius: "#7C3AED",
          frankl: "#06B6D4",
          hof: "#0EA5E9",
          feynman: "#F59E0B",
          davinci: "#EC4899",
          socrates: "#8B5CF6",
          franklin: "#F59E0B",
          jobs: "#1F2937",
        },
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        marquee: "marquee 30s linear infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
