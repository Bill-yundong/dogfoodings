module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/components/**/*.tsx',
    '!**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
