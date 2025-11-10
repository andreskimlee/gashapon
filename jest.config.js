module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'tests/**/*.ts',
    '!tests/**/*.spec.ts',
  ],
  // Handle pnpm's module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Resolve modules from node_modules (works with pnpm)
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Use tsconfig.json directly
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};

