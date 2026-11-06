module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.integration.ts'],
  testTimeout: 30000,
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { rootDir: '.' } }] },
};
