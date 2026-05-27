/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#fdf8f6',
          100: '#f5e6e0',
          200: '#ebcdc2',
          300: '#dbab99',
          400: '#c98268',
          500: '#b86244',
          600: '#a84d35',
          700: '#8c3e2c',
          800: '#743529',
          900: '#612f26',
          950: '#351611',
        },
        cellar: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c5c6cb',
          300: '#a0a2aa',
          400: '#7c7e89',
          500: '#61636e',
          600: '#4d4e58',
          700: '#3f4048',
          800: '#36363d',
          900: '#2f2f35',
          950: '#1a1a1d',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

