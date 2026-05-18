import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#E6EEF9",
          100: "#C0D3F0",
          200: "#96B5E6",
          300: "#6B97DC",
          400: "#4D7FD5",
          500: "#2F67CE",
          600: "#0F52BA",
          700: "#0D4AA8",
          800: "#0B4297",
          900: "#073375",
        },
        accent: {
          50: "#E6FBF5",
          100: "#B3F2E3",
          200: "#80E9D1",
          300: "#4DE0BF",
          400: "#26D9B1",
          500: "#00D4AA",
          600: "#00C09B",
          700: "#00A88A",
          800: "#009179",
          900: "#006B5A",
        },
        warning: {
          50: "#FFF0E8",
          100: "#FFD5BE",
          200: "#FFB793",
          300: "#FF9968",
          400: "#FF8249",
          500: "#FF6B35",
          600: "#E85A24",
          700: "#CC4A1A",
          800: "#B03B12",
          900: "#8A2406",
        },
        dark: {
          50: "#F0F2F5",
          100: "#D9DDE3",
          200: "#B8C0CA",
          300: "#97A2B0",
          400: "#7C899B",
          500: "#617086",
          600: "#4A5668",
          700: "#353E4B",
          800: "#1F2630",
          900: "#0D1117",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(15, 82, 186, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 82, 186, 0.08) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse at center, rgba(15, 82, 186, 0.15) 0%, transparent 70%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(15, 82, 186, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(15, 82, 186, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
