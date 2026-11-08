import { expect, test } from '@playwright/test';
import { apiAs } from '../support/api';
import { createSite, createTask, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

async function newTask() {
  const managerClient = await clientFor(manager);
  const site = await createSite(managerClient);
  const task = await createTask(managerClient, site.id, await userIdOf(await clientFor(executor1)));
  return task;
}

const actions = (card: { availableActions: { toStatus: string }[] }) =>
  card.availableActions.map((a) => a.toStatus);

// Спек task-workflow: поведение через бэкенд.
test.describe('Бэкенд: рабочий процесс задачи', () => {
  test('Полный цикл «Новая → Принята» с историей и доступными действиями на каждом шаге', async () => {
    const task = await newTask();
    const asExecutor = await apiAs(executor1);
    const asManager = await apiAs(manager);

    expect(actions((await asExecutor.get(`/tasks/${task.id}`)).body)).toEqual(['in_progress']);

    const taken = await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'in_progress' });
    expect(taken.status).toBe(200);
    expect(taken.body.status).toBe('in_progress');
    expect(actions(taken.body)).toEqual(['review']);

    const sent = await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'review' });
    expect(sent.body.status).toBe('review');
    expect(actions(sent.body)).toEqual([]);

    const forManager = await asManager.get(`/tasks/${task.id}`);
    expect(actions(forManager.body).sort()).toEqual(['done', 'rework']);
    expect(forManager.body.availableActions).toContainEqual({
      toStatus: 'rework',
      requiresComment: true,
    });

    const accepted = await asManager.post(`/tasks/${task.id}/status`, { toStatus: 'done' });
    expect(accepted.body.status).toBe('done');
    expect(accepted.body.availableActions).toEqual([]);
    expect(accepted.body.history.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'in_progress',
      'review',
      'done',
    ]);
  });

  test('Возврат на доработку с комментарием, затем исполнитель возобновляет работу', async () => {
    const task = await newTask();
    const asExecutor = await apiAs(executor1);
    const asManager = await apiAs(manager);
    await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'in_progress' });
    await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'review' });

    const returned = await asManager.post(`/tasks/${task.id}/status`, {
      toStatus: 'rework',
      comment: 'Исправьте замеры',
    });
    expect(returned.body.status).toBe('rework');
    const last = returned.body.history.at(-1);
    expect(last).toMatchObject({
      fromStatus: 'review',
      toStatus: 'rework',
      comment: 'Исправьте замеры',
    });
    expect(last.changedBy.fullName).toBe('Иван Руководитель');

    const resumed = await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'in_progress' });
    expect(resumed.body.status).toBe('in_progress');
  });

  test('Возврат без комментария отклоняется, статус не меняется', async () => {
    const task = await newTask();
    const asExecutor = await apiAs(executor1);
    const asManager = await apiAs(manager);
    await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'in_progress' });
    await asExecutor.post(`/tasks/${task.id}/status`, { toStatus: 'review' });

    for (const comment of [undefined, '', '   ']) {
      const response = await asManager.post(`/tasks/${task.id}/status`, {
        toStatus: 'rework',
        comment,
      });
      expect(response.status).toBe(422);
      expect(response.body.code).toBe('comment_required');
    }
    expect((await asManager.get(`/tasks/${task.id}`)).body.status).toBe('review');
  });

  test('Недопустимый переход отклоняется, статус и история не меняются', async () => {
    const task = await newTask();
    const asManager = await apiAs(manager);

    const response = await asManager.post(`/tasks/${task.id}/status`, { toStatus: 'done' });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('transition_not_allowed');

    const card = (await asManager.get(`/tasks/${task.id}`)).body;
    expect(card.status).toBe('new');
    expect(card.history).toEqual([]);
  });

  test('Переход выполняет не тот пользователь: чужая задача и не та роль отклоняются', async () => {
    const task = await newTask();
    const asManager = await apiAs(manager);

    const foreign = await (
      await apiAs(executor2)
    ).post(`/tasks/${task.id}/status`, {
      toStatus: 'in_progress',
    });
    expect([403, 404]).toContain(foreign.status);

    const wrongRole = await asManager.post(`/tasks/${task.id}/status`, { toStatus: 'in_progress' });
    expect(wrongRole.status).toBe(403);

    expect((await asManager.get(`/tasks/${task.id}`)).body.status).toBe('new');
  });

  test('Нет доступных действий: у не назначенного исполнителя карточка недоступна, у чужой роли действий нет', async () => {
    const task = await newTask();
    expect((await (await apiAs(executor2)).get(`/tasks/${task.id}`)).status).toBe(404);
    expect((await (await apiAs(manager)).get(`/tasks/${task.id}`)).body.availableActions).toEqual(
      [],
    );
  });

  test('Переход без комментария: комментарий в истории пуст', async () => {
    const task = await newTask();
    const response = await (
      await apiAs(executor1)
    ).post(`/tasks/${task.id}/status`, {
      toStatus: 'in_progress',
    });
    expect(response.body.history[0].comment).toBeNull();
  });

  test('Некорректный статус в запросе отклоняется валидацией', async () => {
    const task = await newTask();
    const response = await (
      await apiAs(executor1)
    ).post(`/tasks/${task.id}/status`, {
      toStatus: 'flying',
    });
    expect(response.status).toBe(400);
  });

  test('Исполнитель видит историю своей задачи, а чужую — нет', async () => {
    const task = await newTask();
    await (await apiAs(executor1)).post(`/tasks/${task.id}/status`, { toStatus: 'in_progress' });

    const own = await (await apiAs(executor1)).get(`/tasks/${task.id}`);
    expect(own.body.history).toHaveLength(1);
    expect((await (await apiAs(executor2)).get(`/tasks/${task.id}`)).status).toBe(404);
  });
});
