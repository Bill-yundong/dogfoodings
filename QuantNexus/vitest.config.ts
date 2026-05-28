import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.svelte.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/storage/**/*.ts',
        'src/analysis/**/*.ts',
        'src/data/**/*.ts',
        'src/strategy/**/*.ts',
        'src/components/**/*.svelte',
        'src/types/**/*.ts'
      ],
      exclude: [
        'src/tests/**',
        'src/main.ts',
        'src/App.svelte'
      ],
      all: true,
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60
      }
    }
  }
});
