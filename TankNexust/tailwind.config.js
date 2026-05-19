/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A1628',
        'bg-secondary': '#12223F',
        'bg-tertiary': '#1A3058',
        'accent-cyan': '#00D9FF',
        'accent-blue': '#3B82F6',
        'risk-safe': '#2ED573',
        'risk-caution': '#FFD700',
        'risk-warning': '#FF7F50',
        'risk-danger': '#FF4757',
        'risk-extreme': '#8B0000',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
        'sans': ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px currentColor' },
          '50%': { opacity: '0.6', boxShadow: '0 0 40px currentColor' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
