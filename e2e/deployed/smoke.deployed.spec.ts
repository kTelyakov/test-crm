import { expect, test } from '@playwright/test';
import { apiAs, apiWithToken } from '../support/api';
import { env } from '../support/env';
import { clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

// Только чтение и заведомо отклоняемые запросы: демо-данные в облаке не меняются.

test.describe('Задеплоенное приложение', () => {
  test('Бэкенд жив, запрос без токена отклоняется', async () => {
    const health = await fetch(`${env.backendUrl}/health`);
    expect(health.status).toBe(200);
    expect((await apiWithToken(null).get('/me')).status).toBe(401);
  });

  test('Открытая регистрация отключена', async () => {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: env.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smoke-hacker@evil.test', password: 'Passw0rd!123' }),
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error_code).toBe('signup_disabled');
  });

  test('CORS: чужой домен не получает разрешения', async () => {
    const response = await fetch(`${env.backendUrl}/me`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  test('Видимость задач через бэкенд: постановщик все, исполнители только свои', async () => {
    const managerTasks = await (await clientFor(manager)).from('tasks').select('id');
    const executorTotal =
      (await (await clientFor(executor1)).from('tasks').select('id')).data!.length +
      (await (await clientFor(executor2)).from('tasks').select('id')).data!.length;
    expect(managerTasks.data!.length).toBeGreaterThan(0);
    expect(managerTasks.data!.length).toBe(executorTotal);

    const mine1 = await (await apiAs(executor1)).get('/tasks/my');
    const mine2 = await (await apiAs(executor2)).get('/tasks/my');
    expect(mine1.status).toBe(200);
    expect(mine2.status).toBe(200);
    const ids1 = new Set(mine1.body.map((t: { id: string }) => t.id));
    for (const task of mine2.body) expect(ids1.has(task.id)).toBe(false);
  });

  test('Прямой запрос к Supabase: исполнитель не меняет статус и не читает чужое', async () => {
    const client = await clientFor(executor1);
    const { data: own } = await client.from('tasks').select('id,status');
    expect(own?.length).toBeGreaterThan(0);

    // Подставляем текущий статус, чтобы даже при сбое защиты данные не изменились.
    const update = await client
      .from('tasks')
      .update({ status: own![0]!.status })
      .eq('id', own![0]!.id);
    expect(update.error).not.toBeNull();

    const other = await (await clientFor(executor2)).from('tasks').select('id');
    const ownIds = new Set(own!.map((t) => t.id));
    for (const task of other.data ?? []) expect(ownIds.has(task.id)).toBe(false);
  });

  for (const [user, name] of [
    [manager, 'Иван Руководитель'],
    [executor1, 'Пётр Исполнитель'],
    [executor2, 'Анна Исполнитель'],
  ] as const) {
    test(`Вход через интерфейс: ${user.email}`, async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Пароль').fill(env.testUserPassword);
      await page.getByRole('button', { name: 'Войти' }).click();

      await expect(page.getByText(name)).toBeVisible({ timeout: 60_000 });
      await expect(page).not.toHaveURL(/\/login$/);
    });
  }

  test('Неавторизованный доступ: перенаправление на вход', async ({ page }) => {
    await page.goto('/sites');
    await expect(page).toHaveURL(/\/login$/);
  });
});
