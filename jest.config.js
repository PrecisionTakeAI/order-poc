const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.join(__dirname),
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.join(__dirname, 'tsconfig.json')
    }]
  },
  moduleDirectories: ['node_modules', 'src/node_modules']
};
