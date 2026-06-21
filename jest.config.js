/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^server-only$': '<rootDir>/jest-mocks/server-only.ts',
    '^next/headers$': '<rootDir>/jest-mocks/next-headers.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Jest needs CommonJS; override the Next.js ESM settings
        module: 'CommonJS',
        moduleResolution: 'node',
        jsx: 'react-jsx',
        esModuleInterop: true,
        strict: true,
      },
    }],
  },
}

module.exports = config
