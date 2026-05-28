/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'space': {
          950: '#050810',
          900: '#0B1220',
          800: '#111A2E',
          700: '#1A2742',
          600: '#243656',
        },
        'neon': {
          cyan: '#00F5FF',
          purple: '#7B61FF',
          pink: '#FF2E93',
        },
        'alert': {
          red: '#FF4757',
          orange: '#FFA502',
          green: '#2ED573',
        },
        'metal': {
          100: '#E8ECF4',
          300: '#B4C2D9',
          500: '#8B9CBF',
          700: '#5A6B8C',
          900: '#2A3550',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flow': 'flow 3s linear infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'number-roll': 'number-roll 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        'flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'number-roll': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'grid': 'linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0,245,255,0.3), 0 0 40px rgba(0,245,255,0.1)',
        'neon-purple': '0 0 20px rgba(123,97,255,0.3), 0 0 40px rgba(123,97,255,0.1)',
        'inner-glow': 'inset 0 0 20px rgba(0,245,255,0.1)',
      },
    },
  },
  plugins: [],
};
