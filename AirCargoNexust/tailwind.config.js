/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        'aviation': {
          900: '#0A2540',
          800: '#0F3460',
          700: '#16537E',
          600: '#1E6091',
          500: '#2A6F97'
        },
        'alert': {
          orange: '#FF6B35',
          red: '#E63946',
          green: '#2EC4B6'
        },
        'dark': {
          900: '#0D0D14',
          800: '#1A1A2E',
          700: '#252542',
          600: '#2E2E4A',
          500: '#3E3E5A'
        }
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(46, 196, 182, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(46, 196, 182, 0.8)' }
        }
      }
    }
  },
  plugins: []
}
