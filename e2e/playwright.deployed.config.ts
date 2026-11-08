import { defineConfig } from '@playwright/test';

// Smoke-прогон против задеплоенного приложения. Серверы не поднимаются.
// Нужны переменные: FRONTEND_URL, BACKEND_URL и облачные SUPABASE_* (из корневого .env).
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // Переменные могут быть заданы окружением.
}

const frontendUrl = process.env['FRONTEND_URL'];
if (!frontendUrl) throw new Error('Не задан FRONTEND_URL — адрес задеплоенного фронтенда');

export default defineConfig({
  testDir: './deployed',
  fullyParallel: false,
  workers: 1,
  // Бэкенд на бесплатном тарифе может «просыпаться» около минуты.
  timeout: 90_000,
  reporter: [['list']],
  use: { baseURL: frontendUrl, channel: 'chrome' },
});
