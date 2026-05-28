import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.ts', 'src/test/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/models/**/*.ts',
        'src/db/**/*.ts',
        'src/context/**/*.tsx',
        'src/data/**/*.ts',
        'src/types/**/*.ts',
      ],
      exclude: [
        'src/test/**',
        'src/main.tsx',
      ],
    },
  },
});
