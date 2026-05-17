import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/models/**/*.ts',
        'src/database/**/*.ts',
        'src/services/**/*.ts',
        'src/components/**/*.tsx',
        'src/App.tsx'
      ],
      exclude: [
        'src/main.tsx',
        'src/types/**/*.ts',
        '**/*.d.ts',
        'src/tests/**/*.ts'
      ]
    }
  }
});
