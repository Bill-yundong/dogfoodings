import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/algorithms/**/*.ts',
        'src/store/**/*.ts',
        'src/utils/**/*.ts',
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/test/**/*',
      ],
    },
  },
});
