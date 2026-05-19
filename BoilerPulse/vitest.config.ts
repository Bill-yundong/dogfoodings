import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$lib': resolve(__dirname, './src/lib')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: [],
    testTimeout: 30000,
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/test-results.json',
      html: './test-results/test-results.html'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/lib/**/*.{ts,js,svelte}'],
      exclude: [
        'src/lib/types/**',
        'src/lib/**/*.d.ts',
        'src/lib/components/**/*.svelte',
        'src/lib/pages/**/*.svelte'
      ],
      reportsDirectory: './test-results/coverage'
    }
  }
});
