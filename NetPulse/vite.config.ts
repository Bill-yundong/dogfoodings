import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'chart-vendor': ['chart.js', 'solid-chartjs'],
          'solid-vendor': ['solid-js', '@solidjs/router'],
          'utils': ['idb', '@solid-primitives/storage', 'lucide-solid'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['chart.js', 'solid-chartjs'],
  },
});
