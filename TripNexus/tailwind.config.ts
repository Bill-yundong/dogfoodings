import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#E6ECF5",
          100: "#C0CFE6",
          200: "#9AB3D7",
          300: "#7496C8",
          400: "#4E7AB9",
          500: "#3E92CC",
          600: "#0A2463",
          700: "#081D4F",
          800: "#06153A",
          900: "#040E26",
        },
        accent: {
          50: "#FFF0E8",
          100: "#FFD4BF",
          200: "#FFB895",
          300: "#FF9C6C",
          400: "#FF8042",
          500: "#FF6B35",
          600: "#CC552A",
          700: "#994020",
          800: "#662A15",
          900: "#33150B",
        },
        dark: {
          50: "#F7F7FF",
          100: "#E8E8F0",
          200: "#D0D0E1",
          300: "#B8B8D2",
          400: "#A0A0C3",
          500: "#1A1A2E",
          600: "#151526",
          700: "#10101D",
          800: "#0A0A13",
          900: "#05050A",
        },
      },
      fontFamily: {
        display: ["SF Pro Display", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        body: ["SF Pro Text", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        "gradient-x": "gradient-x 3s ease infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "dash": "dash 1.5s ease-in-out forwards",
        "slide-in": "slideIn 0.5s ease-out forwards",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        dash: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        slideIn: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "glow": "0 0 20px rgba(62, 146, 204, 0.3)",
        "glow-lg": "0 0 40px rgba(62, 146, 204, 0.4)",
        "card": "0 4px 20px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.12)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #0A2463 0%, #3E92CC 100%)",
        "gradient-accent": "linear-gradient(135deg, #FF6B35 0%, #FF8042 100%)",
        "gradient-hero": "linear-gradient(135deg, #0A2463 0%, #1A1A2E 50%, #0A2463 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
