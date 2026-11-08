import { expect, test } from '@playwright/test';
import { env } from '../support/env';
import { openAs } from '../support/ui';
import { executor1, manager } from '../support/users';

async function fillAndSubmit(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
}

// Спек auth: вход через интерфейс.
test.describe('Вход (UI)', () => {
  test('Успешный вход: постановщик попадает в приложение и видит свою роль', async ({ page }) => {
    await fillAndSubmit(page, manager.email, env.testUserPassword);

    await expect(page).toHaveURL(/\/sites$/);
    await expect(page.getByText('Иван Руководитель')).toBeVisible();
    await expect(page.getByText('Постановщик')).toBeVisible();
  });

  test('Успешный вход: исполнитель видит роль «Исполнитель»', async ({ page }) => {
    await fillAndSubmit(page, executor1.email, env.testUserPassword);

    await expect(page.getByText('Пётр Исполнитель')).toBeVisible();
    await expect(page.getByText('Исполнитель', { exact: true })).toBeVisible();
  });

  test('Неверные учётные данные: сообщение об ошибке, остаёмся на входе', async ({ page }) => {
    await fillAndSubmit(page, manager.email, 'неверный-пароль');

    await expect(page.getByRole('alert')).toHaveText('Неверный email или пароль');
    await expect(page).toHaveURL(/\/login$/);
    const stored = await page.evaluate(() => Object.keys(window.localStorage));
    expect(stored.filter((key) => key.includes('auth-token'))).toEqual([]);
  });

  test('Пустая форма: показываются ошибки валидации', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText('Введите email')).toBeVisible();
    await expect(page.getByText('Введите пароль')).toBeVisible();
  });

  test('Неавторизованный доступ к экранам: перенаправление на вход', async ({ page }) => {
    for (const path of ['/', '/sites']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('Выход: после выхода экраны снова закрыты', async ({ page }) => {
    await openAs(page, manager, '/sites');
    await expect(page.getByText('Иван Руководитель')).toBeVisible();

    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/sites');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Вошедший пользователь на экране входа попадает в приложение', async ({ page }) => {
    await openAs(page, executor1, '/login');
    await expect(page).toHaveURL(/\/sites$/);
  });
});
