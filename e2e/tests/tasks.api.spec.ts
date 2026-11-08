import { expect, test } from '@playwright/test';
import { apiAs } from '../support/api';
import { createExecutor, createSite, createTask, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { changeStatus } from '../support/workflow';
import { executor1, executor2, manager } from '../support/users';

async function setup() {
  const managerClient = await clientFor(manager);
  return {
    site: await createSite(managerClient),
    managerClient,
    executor1Id: await userIdOf(await clientFor(executor1)),
    executor2Id: await userIdOf(await clientFor(executor2)),
    managerId: await userIdOf(managerClient),
  };
}

// Спек tasks: поведение через бэкенд.
test.describe('Бэкенд: задачи', () => {
  test('Создание задачи с исполнителем: статус «Новая», автор и дата проставлены системой', async () => {
    const { site, executor1Id, managerId } = await setup();
    const api = await apiAs(manager);

    const response = await api.post('/tasks', {
      siteId: site.id,
      title: 'Залить фундамент',
      assigneeId: executor1Id,
      // Лишние поля клиента игнорируются: статус и автор задаются системой.
      status: 'done',
      createdBy: executor1Id,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'new',
      createdBy: managerId,
      assignee: { id: executor1Id },
      availableActions: [],
      history: [],
    });
    expect(Date.now() - new Date(response.body.createdAt).getTime()).toBeLessThan(60_000);
  });

  test('Назначать можно только исполнителя: назначение постановщика отклоняется', async () => {
    const { site, managerId } = await setup();
    const response = await (
      await apiAs(manager)
    ).post('/tasks', {
      siteId: site.id,
      title: 'Нельзя',
      assigneeId: managerId,
    });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('assignee_must_be_executor');
  });

  test('Название обязательно: создание без названия отклоняется', async () => {
    const { site, executor1Id } = await setup();
    const api = await apiAs(manager);
    expect((await api.post('/tasks', { siteId: site.id, assigneeId: executor1Id })).status).toBe(
      400,
    );
    expect(
      (await api.post('/tasks', { siteId: site.id, title: '  ', assigneeId: executor1Id })).status,
    ).toBe(400);
  });

  test('Редактирование задачи постановщиком: статус не меняется', async () => {
    const { site, managerClient, executor1Id } = await setup();
    const task = await createTask(managerClient, site.id, executor1Id);

    const response = await (
      await apiAs(manager)
    ).patch(`/tasks/${task.id}`, {
      title: 'Новое название',
      description: 'Новое описание',
      status: 'done',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: 'Новое название',
      description: 'Новое описание',
      status: 'new',
    });
  });

  test('Смена исполнителя у новой задачи', async () => {
    const { site, managerClient, executor1Id, executor2Id } = await setup();
    const task = await createTask(managerClient, site.id, executor1Id);

    const response = await (
      await apiAs(manager)
    ).patch(`/tasks/${task.id}`, {
      assigneeId: executor2Id,
    });
    expect(response.status).toBe(200);
    expect(response.body.assignee.id).toBe(executor2Id);
  });

  test('Смена исполнителя у задачи в работе отклоняется', async () => {
    const { site, managerClient, executor1Id, executor2Id } = await setup();
    const task = await createTask(managerClient, site.id, executor1Id);
    await changeStatus(await clientFor(executor1), task.id, 'in_progress');

    const response = await (
      await apiAs(manager)
    ).patch(`/tasks/${task.id}`, {
      assigneeId: executor2Id,
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('assignee_change_not_allowed');
  });

  test('Исполнитель пытается изменить или удалить задачу: запрос отклоняется', async () => {
    const { site, managerClient, executor1Id } = await setup();
    const task = await createTask(managerClient, site.id, executor1Id);
    const executor = await apiAs(executor1);

    expect(
      (await executor.patch(`/tasks/${task.id}`, { title: 'Взлом' })).status,
    ).toBeGreaterThanOrEqual(403);
    expect((await executor.delete(`/tasks/${task.id}`)).status).toBeGreaterThanOrEqual(403);

    const after = await (await apiAs(manager)).get(`/tasks/${task.id}`);
    expect(after.body.title).toBe(task.title);
  });

  test('Удаление задачи постановщиком', async () => {
    const { site, managerClient, executor1Id } = await setup();
    const task = await createTask(managerClient, site.id, executor1Id);
    const api = await apiAs(manager);

    expect((await api.delete(`/tasks/${task.id}`)).status).toBe(204);
    expect((await api.get(`/tasks/${task.id}`)).status).toBe(404);
  });

  test('Исполнитель открывает чужую задачу: она не возвращается как несуществующая', async () => {
    const { site, managerClient, executor2Id } = await setup();
    const foreign = await createTask(managerClient, site.id, executor2Id);

    const response = await (await apiAs(executor1)).get(`/tasks/${foreign.id}`);
    expect(response.status).toBe(404);
  });

  test('Карточка объекта: постановщик видит все задачи, исполнитель — только свои', async () => {
    const { site, managerClient, executor1Id, executor2Id } = await setup();
    const own = await createTask(managerClient, site.id, executor1Id);
    const foreign = await createTask(managerClient, site.id, executor2Id);

    const asManager = await (await apiAs(manager)).get(`/sites/${site.id}/tasks`);
    expect(asManager.body.map((t: { id: string }) => t.id).sort()).toEqual(
      [own.id, foreign.id].sort(),
    );

    const asExecutor = await (await apiAs(executor1)).get(`/sites/${site.id}/tasks`);
    expect(asExecutor.body.map((t: { id: string }) => t.id)).toEqual([own.id]);
  });

  test('Мои задачи: только назначенные исполнителю, из всех объектов', async () => {
    const first = await setup();
    const second = await setup();
    const a = await createTask(first.managerClient, first.site.id, first.executor1Id);
    const b = await createTask(second.managerClient, second.site.id, second.executor1Id);
    const other = await createTask(first.managerClient, first.site.id, first.executor2Id);

    const response = await (await apiAs(executor1)).get('/tasks/my');
    const ids = response.body.map((t: { id: string }) => t.id);
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));
    expect(ids).not.toContain(other.id);
  });

  test('Мои задачи: у исполнителя без задач список пуст', async () => {
    const newcomer = await createExecutor();

    const response = await (await apiAs(newcomer)).get('/tasks/my');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
