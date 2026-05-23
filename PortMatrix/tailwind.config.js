/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-space': '#0a1628',
        'deep-space-light': '#0f1f3a',
        'deep-space-dark': '#050d18',
        'cyber-blue': '#00d4ff',
        'cyber-blue-dim': '#00a8cc',
        'alert-amber': '#ffb300',
        'alert-red': '#ff5252',
        'safe-green': '#00e676',
        'biz-purple': '#7c4dff',
        'tour-pink': '#ff4081',
        'retail-pink': '#ff4081',
        'transfer-cyan': '#00e5ff',
        'special-orange': '#ff6e40',
      },
      fontFamily: {
        'display': ['Orbitron', 'monospace'],
        'mono': ['JetBrains Mono', 'monospace'],
        'data': ['Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
      },
    },
  },
  plugins: [],
};
