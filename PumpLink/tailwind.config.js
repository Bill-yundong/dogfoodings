/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tech-bg': '#0A192F',
        'tech-bg-light': '#112240',
        'tech-accent': '#64FFDA',
        'tech-accent-dark': '#4FD1B2',
        'status-normal': '#00C853',
        'status-warning': '#FFD600',
        'status-severe': '#FF9100',
        'status-critical': '#FF1744',
        'text-primary': '#E6F1FF',
        'text-secondary': '#8892B0',
        'text-muted': '#64FFDA'
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #64FFDA, 0 0 10px #64FFDA' },
          '100%': { boxShadow: '0 0 20px #64FFDA, 0 0 30px #64FFDA' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [],
}
