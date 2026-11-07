import { expect, test } from '@playwright/test';
import { clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

test.describe('Вход тестовых пользователей', () => {
  for (const user of [manager, executor1, executor2]) {
    test(`${user.email} успешно входит`, async () => {
      const client = await clientFor(user);
      const { data: auth } = await client.auth.getUser();

      // Роль пользователя проверяется тестами RLS: профили закрыты, пока не добавлены политики.
      expect(auth.user?.email).toBe(user.email);
    });
  }
});
