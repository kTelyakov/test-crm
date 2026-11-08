import { defineConfig } from 'orval';

/** Генерирует типы, функции запросов и хуки TanStack Query из контракта бэкенда. Сгенерированный код руками не правится. */
export default defineConfig({
  api: {
    input: '../backend/openapi.json',
    output: {
      target: './src/shared/api/generated/api.ts',
      schemas: './src/shared/api/generated/types',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: { path: './src/shared/api/api-client.ts', name: 'apiClient' },
      },
    },
  },
});
