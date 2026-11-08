import type { Page } from '@playwright/test';
import { env } from './env';
import { clientFor } from './supabase';
import type { TestUser } from './users';

/** Ключ, под которым supabase-js хранит сессию в localStorage браузера. */
const storageKey = () => `sb-${new URL(env.supabaseUrl).hostname.split('.')[0]}-auth-token`;

/**
 * Открывает страницу уже вошедшим пользователем: сессия кладётся в localStorage так же, как её сохраняет
 * приложение после входа. Экран входа проверяется отдельно, через форму.
 */
export async function openAs(page: Page, user: TestUser, path = '/') {
  const client = await clientFor(user);
  const { data } = await client.auth.getSession();
  await page.addInitScript(
    ([key, session]) => window.localStorage.setItem(key!, session!),
    [storageKey(), JSON.stringify(data.session)],
  );
  await page.goto(path);
}
