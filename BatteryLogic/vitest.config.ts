import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: [
        'src/**/*.{ts,vue}',
        '!src/**/*.d.ts',
        '!src/main.ts',
        '!src/App.vue',
        '!src/router/index.ts'
      ],
      exclude: [
        'src/workers/**'
      ]
    }
  }
})
