module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@support-pillar/(.*)$': '<rootDir>/pillars/support-pillar/$1',
    '^@core-infrastructure/(.*)$': '<rootDir>/pillars/core-infrastructure/$1',
    '^@partner-pillar/(.*)$': '<rootDir>/pillars/partner-pillar/$1',
    '^@analytics-pillar/(.*)$': '<rootDir>/pillars/analytics-pillar/$1',
  },
  collectCoverageFrom: [
    'pillars/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/index.ts',
    '!**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
    },
  },
  testTimeout: 10000,
  verbose: true,
}
