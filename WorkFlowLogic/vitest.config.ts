import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import path from 'path'

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    reporters: [['default', { summary: true }], 'json'],
    outputFile: {
      json: './test-report.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      outputDirectory: './coverage',
    },
    forks: true,
    singleFork: true,
    maxConcurrency: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
})
