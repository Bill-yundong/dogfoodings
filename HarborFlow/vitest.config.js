import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}', 'src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/core/**/*.js', 'src/ui/**/*.jsx'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
      reportsDirectory: './coverage'
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    }
  }
})
