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
        'deep-ocean': {
          50: '#E6ECF5',
          100: '#C2D1E8',
          200: '#9AB3DA',
          300: '#7195CC',
          400: '#527FC2',
          500: '#3369B8',
          600: '#2E60B0',
          700: '#2754A5',
          800: '#1F499B',
          900: '#0A2463',
          950: '#061640',
        },
        'alert-orange': {
          50: '#FEF1EC',
          100: '#FDDACF',
          200: '#FBBFAD',
          300: '#F9A48B',
          400: '#F78F71',
          500: '#F46036',
          600: '#E25832',
          700: '#CB4D2C',
          800: '#B54326',
          900: '#8A331D',
        },
        'safety-green': {
          50: '#E7F5F3',
          100: '#C3E6E1',
          200: '#9BD6CD',
          300: '#72C6B9',
          400: '#54B9AA',
          500: '#1B998B',
          600: '#188C80',
          700: '#147A70',
          800: '#106960',
          900: '#0A4B44',
        },
        'steel': {
          50: '#F5F7FA',
          100: '#E4E7EB',
          200: '#CBD2D9',
          300: '#9AA5B1',
          400: '#7B8794',
          500: '#616E7C',
          600: '#52606D',
          700: '#3E4C59',
          800: '#323F4B',
          900: '#1F2933',
          950: '#12181F',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'radar': 'radar 4s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(51, 105, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(51, 105, 184, 0.1) 1px, transparent 1px)",
        'contour-pattern': "repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(27, 153, 139, 0.05) 10px, rgba(27, 153, 139, 0.05) 11px)",
      },
    },
  },
  plugins: [],
};
