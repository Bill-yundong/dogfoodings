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
        subway: {
          primary: "#1a56db",
          secondary: "#7e3af2",
          danger: "#e02424",
          warning: "#ff8c00",
          success: "#0e9f6e",
          dark: "#1a1a2e",
          light: "#f7fafc",
        },
      },
    },
  },
  plugins: [],
};

export default config;
