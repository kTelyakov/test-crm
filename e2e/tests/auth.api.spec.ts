import { expect, test } from '@playwright/test';
import { apiAs, apiWithToken } from '../support/api';
import { executor1, manager } from '../support/users';

// Спек auth: защита доступа через бэкенд.
test.describe('Бэкенд: аутентификация', () => {
  test('Неавторизованный доступ к экранам: запрос без токена отклоняется', async () => {
    const response = await apiWithToken(null).get('/me');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('unauthenticated');
  });

  test('Неавторизованный доступ: недействительный токен отклоняется', async () => {
    const response = await apiWithToken('not-a-real-token').get('/me');
    expect(response.status).toBe(401);
  });

  test('Успешный вход: бэкенд знает роль пользователя по токену', async () => {
    const asManager = await (await apiAs(manager)).get('/me');
    expect(asManager.status).toBe(200);
    expect(asManager.body).toMatchObject({ role: 'manager', fullName: 'Иван Руководитель' });

    const asExecutor = await (await apiAs(executor1)).get('/me');
    expect(asExecutor.body).toMatchObject({ role: 'executor' });
  });

  test('Подмена идентичности: заголовки и параметры не меняют роль', async () => {
    const api = await apiAs(executor1);
    const managerId = (await (await apiAs(manager)).get('/me')).body.id;

    const response = await api.get(`/me?userId=${managerId}&role=manager`, {
      'x-user-id': managerId,
      'x-user-role': 'manager',
    });
    expect(response.body.role).toBe('executor');
    expect(response.body.id).not.toBe(managerId);
  });

  test('Список исполнителей доступен для назначения', async () => {
    const response = await (await apiAs(manager)).get('/executors');
    expect(response.status).toBe(200);
    const roles = response.body.map((u: { role: string }) => u.role);
    expect(roles.length).toBeGreaterThanOrEqual(2);
    expect(new Set(roles)).toEqual(new Set(['executor']));
  });
});
