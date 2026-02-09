import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        council: {
          bg: "#F8F9FA",
          "bg-dark": "#E9ECEF",
          text: "#1A1A1A",
          muted: "#6B7280",
          accent: "#3B82F6",
          success: "#10B981",
          urgent: "#EF4444",
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
      },
    },
  },
  plugins: [],
};

export default config;
