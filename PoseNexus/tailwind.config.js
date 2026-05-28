/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F0FF',
          100: '#CFE1FF',
          200: '#9FC3FF',
          300: '#6FA5FF',
          400: '#3F87FF',
          500: '#165DFF',
          600: '#0E4BCC',
          700: '#0A3999',
          800: '#062766',
          900: '#031533',
        },
        accent: {
          50: '#FFF1E6',
          100: '#FFE3CC',
          200: '#FFC799',
          300: '#FFAB66',
          400: '#FF8F33',
          500: '#FF7D00',
          600: '#CC6400',
          700: '#994B00',
          800: '#663200',
          900: '#331900',
        },
        success: {
          500: '#00B42A',
        },
        danger: {
          500: '#F53F3F',
        },
        dark: {
          50: '#F7F8FA',
          100: '#E8EAED',
          200: '#C9CDD4',
          300: '#86909C',
          400: '#4E5969',
          500: '#272E3B',
          600: '#1D2129',
          700: '#000000',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(22, 93, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(22, 93, 255, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
