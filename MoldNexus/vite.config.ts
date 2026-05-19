import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'fluid-engine': ['src/engine/lbmEngine.ts'],
          'defect-engine': ['src/engine/defectEngine.ts']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  worker: {
    format: 'es'
  }
});
