// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  transform: {},
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Remove global setup/teardown to avoid issues
  // globalSetup: undefined,
  // globalTeardown: undefined,
  
  // Don't try to mock modules automatically
  automock: false,
  resetMocks: false,
  clearMocks: true,
  restoreMocks: false
};