import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/lib/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/simulation/**/*.ts',
        'src/lib/storage/**/*.ts',
        'src/lib/sync/**/*.ts',
      ],
      exclude: ['src/**/__tests__/**'],
    },
  },
});
