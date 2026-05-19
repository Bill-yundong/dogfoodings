/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,svelte}'],
  theme: {
    extend: {
      colors: {
        'deep-sea': '#0A2463',
        'tech-cyan': '#3E92CC',
        'warning-orange': '#FF9F1C',
        'danger-red': '#E63946',
        'safe-green': '#2EC4B6',
        'space-dark': '#0D1117',
        'space-gray': '#161B22',
        'space-light': '#21262D',
        'panel-bg': '#0F172A',
        'grid-line': 'rgba(62, 146, 204, 0.1)'
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(62, 146, 204, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(62, 146, 204, 0.8)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    }
  },
  plugins: []
};
