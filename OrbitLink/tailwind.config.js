/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        space: {
          void: "#05070d",
          base: "#0b1220",
          panel: "#0f172a",
          border: "#1e293b",
          muted: "#334155",
          text: "#e2e8f0",
          dim: "#94a3b8",
        },
        accent: {
          orbit: "#38bdf8",
          warn: "#facc15",
          alert: "#ef4444",
          data: "#22d3ee",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(56,189,248,0.25)",
        alert: "0 0 18px rgba(239,68,68,0.45)",
      },
      backgroundImage: {
        "grid-stars":
          "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(168,85,247,0.08), transparent 45%)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2.2s ease-in-out infinite",
        scan: "scan 6s linear infinite",
      },
    },
  },
  plugins: [],
};
