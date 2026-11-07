import { expect, test } from '@playwright/test';
import { createSite, unique } from '../support/factories';
import { anonClient, clientFor } from '../support/supabase';
import { executor1, manager } from '../support/users';

test.describe('Регистрация (спек auth)', () => {
  test('Самостоятельная регистрация через публичный API отклоняется', async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: `${unique('stranger')}@test.local`,
      password: 'Some-password-123',
    });

    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});

test.describe('Роли (спек auth)', () => {
  test('Пользователь не может изменить свою роль прямым запросом', async () => {
    const e1 = await clientFor(executor1);
    const {
      data: { user },
    } = await e1.auth.getUser();

    const updated = await e1
      .from('profiles')
      .update({ role: 'manager' })
      .eq('id', user!.id)
      .select();

    expect(updated.data ?? []).toEqual([]);
    const { data } = await e1.from('profiles').select('role').eq('id', user!.id).single();
    expect(data?.role).toBe('executor');
  });

  test('Нельзя создать профиль с чужой ролью или удалить профиль', async () => {
    const e1 = await clientFor(executor1);

    const inserted = await e1
      .from('profiles')
      .insert({ id: crypto.randomUUID(), full_name: 'X', role: 'manager' });
    const deleted = await e1.from('profiles').delete().neq('id', crypto.randomUUID()).select();

    expect(inserted.error).not.toBeNull();
    expect(deleted.data ?? []).toEqual([]);
  });

  test('Роль в метаданных пользователя не даёт прав постановщика', async () => {
    const e1 = await clientFor(executor1);
    await e1.auth.updateUser({ data: { role: 'manager' } });

    const { error } = await e1.from('sites').insert({ name: unique('Объект'), address: 'ул. 1' });

    expect(error).not.toBeNull();
  });

  test('Постановщик и исполнитель не могут изменить роль друг друга', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const {
      data: { user },
    } = await e1.auth.getUser();

    const updated = await m
      .from('profiles')
      .update({ role: 'manager' })
      .eq('id', user!.id)
      .select();

    expect(updated.data ?? []).toEqual([]);
    const { data } = await m.from('profiles').select('role').eq('id', user!.id).single();
    expect(data?.role).toBe('executor');
  });
});

test.describe('Доступ к данным без входа (спек auth)', () => {
  test('Без токена ни одна таблица не отдаёт данные', async () => {
    const anon = anonClient();
    await createSite(await clientFor(manager));

    for (const table of ['profiles', 'sites', 'tasks', 'task_status_history', 'task_transitions']) {
      const { data } = await anon.from(table).select('*');
      expect(data ?? [], table).toEqual([]);
    }
  });
});
