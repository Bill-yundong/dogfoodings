/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        metabo: {
          dark: '#0D1117',
          green: '#0A2E1C',
          glow: '#00FF88',
          amber: '#F5A623',
          surface: '#161B22',
          border: '#21262D',
          muted: '#8B949E',
          text: '#E6EDF3',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 255, 136, 0.2)',
        amber: '0 0 20px rgba(245, 166, 35, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 255, 136, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(0, 255, 136, 0.5)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
