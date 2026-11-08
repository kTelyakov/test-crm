import { defineConfig } from '@playwright/test';

// Общие переменные окружения лежат в корневом .env (в git не попадает).
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // Переменные могут быть заданы окружением (например, в CI).
}

export default defineConfig({
  testDir: './tests',
  // Тесты работают с одной общей базой, поэтому идут последовательно.
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  webServer: {
    // Бэкенд запускается из своей папки, чтобы подхватить tsx без вложенного вызова pnpm.
    command: 'node --import tsx src/server.ts',
    cwd: '../backend',
    url: 'http://localhost:3100/health',
    env: { PORT: '3100', NODE_ENV: 'test' },
    reuseExistingServer: !process.env['CI'],
  },
});
