const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.join(__dirname),
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@aws-sdk/client-dynamodb$': '<rootDir>/src/node_modules/@aws-sdk/client-dynamodb',
    '^@aws-sdk/lib-dynamodb$': '<rootDir>/src/node_modules/@aws-sdk/lib-dynamodb',
    '^aws-jwt-verify$': '<rootDir>/node_modules/aws-jwt-verify',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.join(__dirname, 'tsconfig.json')
    }]
  },
  moduleDirectories: ['node_modules', 'src/node_modules']
};
