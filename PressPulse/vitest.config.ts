import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/utils/**/*.ts',
        'src/db/**/*.ts',
        'src/components/**/*.tsx',
        'src/App.tsx',
      ],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/test/**/*',
      ],
    },
  },
})
