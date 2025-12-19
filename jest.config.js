/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  // Define o padrão para encontrar arquivos de teste, focando na pasta src do gateway
  testMatch: ['<rootDir>/gateway/src/**/*.test.ts'],
  // Ignora a pasta dist ao procurar por testes
  testPathIgnorePatterns: ['/node_modules/', '/gateway/dist/'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
};