/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'cyber-bg': '#0a0e17',
        'cyber-bg-light': '#141a28',
        'cyber-bg-lighter': '#1e2638',
        'cyber-surface': '#111827',
        'cyber-border': '#2a3447',
        'cyber-text': '#e8edf5',
        'cyber-text-secondary': '#8892b0',
        'cyber-text-muted': '#5a6578',
        'electric-blue': '#00d4ff',
        'electric-blue-dark': '#0099cc',
        'electric-blue-light': '#66e5ff',
        'warning-orange': '#ff9500',
        'success-green': '#00ff88',
        'error-red': '#ff4444',
        'electric-purple': '#a855f7'
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 4s linear infinite',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.8), 0 0 30px rgba(0, 212, 255, 0.4)' }
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
