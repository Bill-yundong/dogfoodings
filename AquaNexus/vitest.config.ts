import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/models/**/*.ts',
        'src/services/**/*.ts',
        'src/components/**/*.tsx',
      ],
      exclude: [
        'src/**/*.worker.ts',
        'src/test/**',
      ],
    },
  },
})
