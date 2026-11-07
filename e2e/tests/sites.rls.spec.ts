import { expect, test } from '@playwright/test';
import { createSite, createTask, unique, userIdOf } from '../support/factories';
import { anonClient, clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

test.describe('Объекты: управление (спек sites)', () => {
  test('Создание объекта постановщиком', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);

    const { data } = await m.from('sites').select('id').eq('id', site.id);
    expect(data).toHaveLength(1);
  });

  test('Обязательные поля: нельзя сохранить объект без названия или без адреса', async () => {
    const m = await clientFor(manager);

    const noName = await m.from('sites').insert({ name: '  ', address: 'ул. Тестовая, 1' });
    const noAddress = await m.from('sites').insert({ name: unique('Объект'), address: '' });

    expect(noName.error).not.toBeNull();
    expect(noAddress.error).not.toBeNull();
  });

  test('Исполнитель не управляет объектами: создать, изменить и удалить нельзя', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const site = await createSite(m);
    await createTask(m, site.id, await userIdOf(e1));

    const created = await e1.from('sites').insert({ name: unique('Объект'), address: 'ул. 1' });
    const updated = await e1.from('sites').update({ name: 'Взлом' }).eq('id', site.id).select();
    const deleted = await e1.from('sites').delete().eq('id', site.id).select();

    expect(created.error).not.toBeNull();
    expect(updated.data).toEqual([]);
    expect(deleted.data).toEqual([]);

    const { data } = await m.from('sites').select('name').eq('id', site.id).single();
    expect(data?.name).toBe(site.name);
  });
});

test.describe('Объекты: удаление (спек sites)', () => {
  test('Удаление объекта с задачами отклоняется', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    await createTask(m, site.id, await userIdOf(await clientFor(executor1)));

    const { error } = await m.from('sites').delete().eq('id', site.id);

    expect(error).not.toBeNull();
    const { data } = await m.from('sites').select('id').eq('id', site.id);
    expect(data).toHaveLength(1);
  });

  test('Удаление пустого объекта проходит', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);

    const { error } = await m.from('sites').delete().eq('id', site.id);

    expect(error).toBeNull();
    const { data } = await m.from('sites').select('id').eq('id', site.id);
    expect(data).toEqual([]);
  });
});

test.describe('Объекты: видимость в обход интерфейса (спек sites)', () => {
  test('Исполнитель напрямую видит только объекты со своими задачами', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const e2 = await clientFor(executor2);
    const siteOfE1 = await createSite(m);
    const siteOfE2 = await createSite(m);
    await createTask(m, siteOfE1.id, await userIdOf(e1));
    await createTask(m, siteOfE2.id, await userIdOf(e2));

    const { data: all } = await e1.from('sites').select('id');
    const ids = (all ?? []).map((s) => s.id);

    expect(ids).toContain(siteOfE1.id);
    expect(ids).not.toContain(siteOfE2.id);
  });

  test('Прямой доступ к чужому объекту: объект не возвращается', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const foreignSite = await createSite(m);
    await createTask(m, foreignSite.id, await userIdOf(await clientFor(executor2)));

    const { data } = await e1.from('sites').select('id').eq('id', foreignSite.id);

    expect(data).toEqual([]);
  });

  test('Постановщик видит все объекты', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);

    const { data } = await m.from('sites').select('id').eq('id', site.id);

    expect(data).toHaveLength(1);
  });

  test('Без входа объекты недоступны', async () => {
    const { data, error } = await anonClient().from('sites').select('id');

    expect(data ?? []).toEqual([]);
    expect(error).not.toBeNull();
  });
});
