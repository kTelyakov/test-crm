import { expect, test } from '@playwright/test';
import { apiAs } from '../support/api';
import { createSite, createTask, unique, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

// Спек sites: поведение через бэкенд.
test.describe('Бэкенд: объекты', () => {
  test('Создание объекта: постановщик создаёт объект, он появляется в списке', async () => {
    const api = await apiAs(manager);
    const name = unique('Новый объект');

    const created = await api.post('/sites', { name, address: 'ул. Новая, 5' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name, address: 'ул. Новая, 5' });

    const list = await api.get('/sites');
    expect(list.body.map((s: { id: string }) => s.id)).toContain(created.body.id);
  });

  test('Обязательные поля: без названия или адреса сохранение отклоняется', async () => {
    const api = await apiAs(manager);
    expect((await api.post('/sites', { address: 'ул. Новая, 5' })).status).toBe(400);
    expect((await api.post('/sites', { name: 'Без адреса' })).status).toBe(400);
    expect((await api.post('/sites', { name: '   ', address: 'ул. Новая, 5' })).status).toBe(400);
  });

  test('Редактирование объекта постановщиком', async () => {
    const api = await apiAs(manager);
    const site = await createSite(await clientFor(manager));

    const updated = await api.patch(`/sites/${site.id}`, { address: 'ул. Другая, 7' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: site.name, address: 'ул. Другая, 7' });
  });

  test('Исполнитель не управляет объектами: создание, изменение и удаление отклоняются', async () => {
    const site = await createSite(await clientFor(manager));
    const executor = await apiAs(executor1);

    const create = await executor.post('/sites', { name: unique('Чужой'), address: 'ул. 1' });
    expect(create.status).toBe(403);

    const update = await executor.patch(`/sites/${site.id}`, { name: 'Взлом' });
    expect(update.status).toBeGreaterThanOrEqual(403);
    expect((await executor.delete(`/sites/${site.id}`)).status).toBeGreaterThanOrEqual(403);

    const after = await (await apiAs(manager)).get(`/sites/${site.id}`);
    expect(after.body.name).toBe(site.name);
  });

  test('Удаление объекта с задачами отклоняется с объяснением', async () => {
    const managerClient = await clientFor(manager);
    const site = await createSite(managerClient);
    await createTask(managerClient, site.id, await userIdOf(await clientFor(executor1)));

    const api = await apiAs(manager);
    const response = await api.delete(`/sites/${site.id}`);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('site_has_tasks');
    expect((await api.get(`/sites/${site.id}`)).status).toBe(200);
  });

  test('Удаление пустого объекта', async () => {
    const site = await createSite(await clientFor(manager));
    const api = await apiAs(manager);

    expect((await api.delete(`/sites/${site.id}`)).status).toBe(204);
    expect((await api.get(`/sites/${site.id}`)).status).toBe(404);
  });

  test('Список объектов исполнителя: только объекты с его задачами', async () => {
    const managerClient = await clientFor(manager);
    const own = await createSite(managerClient);
    const foreign = await createSite(managerClient);
    await createTask(managerClient, own.id, await userIdOf(await clientFor(executor1)));
    await createTask(managerClient, foreign.id, await userIdOf(await clientFor(executor2)));

    const list = await (await apiAs(executor1)).get('/sites');
    const ids = list.body.map((s: { id: string }) => s.id);
    expect(ids).toContain(own.id);
    expect(ids).not.toContain(foreign.id);
  });

  test('Прямой доступ к чужому объекту: объект не возвращается как несуществующий', async () => {
    const managerClient = await clientFor(manager);
    const foreign = await createSite(managerClient);
    await createTask(managerClient, foreign.id, await userIdOf(await clientFor(executor2)));

    const response = await (await apiAs(executor1)).get(`/sites/${foreign.id}`);
    expect(response.status).toBe(404);
  });
});
