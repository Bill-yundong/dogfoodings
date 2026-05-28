import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/utils/**/*.ts',
        'src/composables/**/*.ts',
        'src/stores/**/*.ts',
        'src/components/**/*.vue',
        'src/views/**/*.vue'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**'
      ]
    }
  }
})
