/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4fa',
          100: '#d9e3f1',
          200: '#b3c7e2',
          300: '#85a5cd',
          400: '#527fb4',
          500: '#2e5d96',
          600: '#1f4678',
          700: '#16355e',
          800: '#0b2545',
          900: '#061729'
        },
        accent: {
          gold: '#D4A017',
          teal: '#2EC4B6',
          coral: '#FF6B6B'
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
