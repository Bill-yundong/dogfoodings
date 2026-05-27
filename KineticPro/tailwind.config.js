/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        dm: ['DM Sans', 'sans-serif'],
      },
      colors: {
        kinetic: {
          bg: '#0A0E1A',
          card: '#1A1F2E',
          border: '#2A2F3E',
          accent: '#00F0B5',
          warn: '#FF6B2B',
          data: '#6366F1',
          gold: '#FFD60A',
          danger: '#FF2D55',
          text: '#E8ECF4',
          muted: '#8B95A5',
          dim: '#4B5563',
          surface: '#0D1117',
        },
      },
    },
  },
  plugins: [],
};
