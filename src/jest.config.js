const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node'],
        typeRoots: [path.join(__dirname, 'node_modules/@types')],
        esModuleInterop: true,
        target: 'ES2020',
        module: 'commonjs'
      }
    }]
  }
};
