import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Courier New", "monospace"],
        label: ["var(--font-label)", "Georgia", "serif"],
      },
      colors: {
        council: {
          // Primary navy palette
          navy: "#0a1628",
          "navy-light": "#0d1f3c",
          "navy-mid": "#112240",
          surface: "#0f1e35",
          border: "#1e3a5f",
          // Gold accent spectrum
          gold: "#c9a84c",
          "gold-light": "#e8c97a",
          "gold-dim": "#8a6d2f",
          cream: "#f5f0e8",
          // Text
          "text-primary": "#e8dcc8",
          "text-secondary": "#9a8a6a",
          "text-tertiary": "#5a4e3a",
          // Legacy aliases (kept for backward compat, updated values)
          bg: "#0a1628",
          "surface-elevated": "#112240",
        },
        agent: {
          rockefeller: "#c9a84c",
          napoleon: "#b87333",
          bismarck: "#8b9467",
          walker: "#cd7f32",
          aurelius: "#a0956b",
          frankl: "#9b8f6e",
          hof: "#7b9ea6",
          feynman: "#d4a853",
          davinci: "#c4956a",
          socrates: "#b8a88a",
          franklin: "#c9a227",
          jobs: "#8a7f72",
        },
      },
      boxShadow: {
        "gold-glow": "0 0 20px rgba(201, 168, 76, 0.25), 0 0 40px rgba(201, 168, 76, 0.10)",
        "gold-glow-strong": "0 0 30px rgba(201, 168, 76, 0.45), 0 0 60px rgba(201, 168, 76, 0.20)",
        "council-card": "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(201, 168, 76, 0.08)",
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        marquee: "marquee 30s linear infinite",
        "council-pulse": "councilPulse 1.2s ease-in-out infinite",
        "council-expand": "councilExpand 1.5s ease-in-out infinite",
        "speaking-pulse": "speakingPulse 2s ease-in-out infinite",
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
        councilPulse: {
          "0%, 100%": { transform: "scaleY(0.6)", opacity: "0.3" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
        councilExpand: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        speakingPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
