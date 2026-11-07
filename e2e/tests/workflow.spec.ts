import { expect, test } from '@playwright/test';
import { createSite, createTask, userIdOf } from '../support/factories';
import { adminClient, clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';
import { changeStatus, historyOf, statusOf } from '../support/workflow';

/** Новая задача, назначенная executor1, и клиенты всех трёх ролей. */
async function setup() {
  const m = await clientFor(manager);
  const e1 = await clientFor(executor1);
  const e2 = await clientFor(executor2);
  const site = await createSite(m);
  const task = await createTask(m, site.id, await userIdOf(e1));
  return { m, e1, e2, taskId: task.id };
}

test.describe('Разрешённые переходы (спек task-workflow)', () => {
  test('Полный цикл: взять в работу → на проверку → принять, история фиксирует каждый шаг', async () => {
    const { m, e1, taskId } = await setup();

    expect((await changeStatus(e1, taskId, 'in_progress')).error).toBeNull();
    expect(await statusOf(m, taskId)).toBe('in_progress');
    expect((await changeStatus(e1, taskId, 'review')).error).toBeNull();
    expect(await statusOf(m, taskId)).toBe('review');
    expect((await changeStatus(m, taskId, 'done')).error).toBeNull();
    expect(await statusOf(m, taskId)).toBe('done');

    const history = await historyOf(m, taskId);
    expect(history.map((h) => [h.from_status, h.to_status])).toEqual([
      ['new', 'in_progress'],
      ['in_progress', 'review'],
      ['review', 'done'],
    ]);
  });

  test('Постановщик возвращает на доработку с комментарием, исполнитель возобновляет работу', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');
    await changeStatus(e1, taskId, 'review');

    expect((await changeStatus(m, taskId, 'rework', 'Исправить замеры')).error).toBeNull();
    expect(await statusOf(m, taskId)).toBe('rework');
    expect((await changeStatus(e1, taskId, 'in_progress')).error).toBeNull();
    expect(await statusOf(m, taskId)).toBe('in_progress');
  });
});

test.describe('Запрещённые переходы (спек task-workflow)', () => {
  test('Недопустимый переход отклоняется, статус и история не меняются', async () => {
    const { m, taskId } = await setup();

    const { error } = await changeStatus(m, taskId, 'done');

    expect(error?.message).toBe('transition_not_allowed');
    expect(await statusOf(m, taskId)).toBe('new');
    expect(await historyOf(m, taskId)).toEqual([]);
  });

  test('Принятая задача завершена: переходы из неё недоступны', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');
    await changeStatus(e1, taskId, 'review');
    await changeStatus(m, taskId, 'done');

    for (const to of ['new', 'in_progress', 'review', 'rework'] as const) {
      const { error } = await changeStatus(m, taskId, to, 'комментарий');
      expect(error?.message).toBe('transition_not_allowed');
    }
    expect(await statusOf(m, taskId)).toBe('done');
  });

  test('Постановщик не может выполнить переход исполнителя', async () => {
    const { m, taskId } = await setup();

    const { error } = await changeStatus(m, taskId, 'in_progress');

    expect(error?.message).toBe('transition_forbidden');
    expect(await statusOf(m, taskId)).toBe('new');
  });

  test('Исполнитель не может выполнить переход постановщика', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');
    await changeStatus(e1, taskId, 'review');

    const accept = await changeStatus(e1, taskId, 'done');
    const reject = await changeStatus(e1, taskId, 'rework', 'сам себе верну');

    expect(accept.error?.message).toBe('transition_forbidden');
    expect(reject.error?.message).toBe('transition_forbidden');
    expect(await statusOf(m, taskId)).toBe('review');
  });

  test('Не назначенный исполнитель не может менять статус чужой задачи', async () => {
    const { m, e2, taskId } = await setup();

    const { error } = await changeStatus(e2, taskId, 'in_progress');

    expect(error?.message).toBe('task_not_found');
    expect(await statusOf(m, taskId)).toBe('new');
    expect(await historyOf(m, taskId)).toEqual([]);
  });

  test('Без входа функция недоступна', async () => {
    const { m, taskId } = await setup();
    const { anonClient } = await import('../support/supabase');

    const { error } = await changeStatus(anonClient(), taskId, 'in_progress');

    expect(error).not.toBeNull();
    expect(await statusOf(m, taskId)).toBe('new');
  });

  test('Несуществующая задача', async () => {
    const { m } = await setup();

    const { error } = await changeStatus(m, '00000000-0000-0000-0000-000000000000', 'done');

    expect(error?.message).toBe('task_not_found');
  });
});

test.describe('Комментарий при возврате (спек task-workflow)', () => {
  for (const [name, comment] of [
    ['без комментария', undefined],
    ['с пустым комментарием', ''],
    ['с комментарием из пробелов', '   '],
  ] as const) {
    test(`Возврат на доработку ${name} отклоняется`, async () => {
      const { m, e1, taskId } = await setup();
      await changeStatus(e1, taskId, 'in_progress');
      await changeStatus(e1, taskId, 'review');

      const { error } = await changeStatus(m, taskId, 'rework', comment);

      expect(error?.message).toBe('comment_required');
      expect(await statusOf(m, taskId)).toBe('review');
    });
  }

  test('Переход без комментария выполняется, в истории комментарий пуст', async () => {
    const { m, e1, taskId } = await setup();

    await changeStatus(e1, taskId, 'in_progress');

    const [entry] = await historyOf(m, taskId);
    expect(entry?.comment).toBeNull();
  });
});

test.describe('История статусов (спек task-workflow)', () => {
  test('Запись содержит автора, время, статусы «из» и «в» и комментарий', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');
    await changeStatus(e1, taskId, 'review');
    await changeStatus(m, taskId, 'rework', 'Нужны правки');

    const history = await historyOf(m, taskId);
    const last = history.at(-1);

    expect(last).toMatchObject({
      from_status: 'review',
      to_status: 'rework',
      changed_by: await userIdOf(m),
      comment: 'Нужны правки',
    });
    expect(last?.created_at).toBeTruthy();
  });

  test('Постановщик и назначенный исполнитель видят историю, чужой исполнитель нет', async () => {
    const { m, e1, e2, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');

    expect(await historyOf(m, taskId)).toHaveLength(1);
    expect(await historyOf(e1, taskId)).toHaveLength(1);
    expect(await historyOf(e2, taskId)).toEqual([]);
  });

  test('Клиент не может создать, изменить или удалить запись истории', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');
    const forged = {
      task_id: taskId,
      from_status: 'new',
      to_status: 'done',
      changed_by: await userIdOf(m),
    };

    for (const client of [m, e1]) {
      const inserted = await client.from('task_status_history').insert(forged);
      const updated = await client
        .from('task_status_history')
        .update({ to_status: 'done' })
        .eq('task_id', taskId)
        .select();
      const deleted = await client
        .from('task_status_history')
        .delete()
        .eq('task_id', taskId)
        .select();

      expect(inserted.error).not.toBeNull();
      expect(updated.data ?? []).toEqual([]);
      expect(deleted.data ?? []).toEqual([]);
    }
    expect(await historyOf(m, taskId)).toHaveLength(1);
  });

  test('Даже при обходе RLS (service_role) запись истории изменить или удалить нельзя', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');
    const admin = adminClient();

    const updated = await admin
      .from('task_status_history')
      .update({ comment: 'подделка' })
      .eq('task_id', taskId);
    const deleted = await admin.from('task_status_history').delete().eq('task_id', taskId);

    expect(updated.error?.message).toContain('history_is_immutable');
    expect(deleted.error?.message).toContain('history_is_immutable');
    expect(await historyOf(m, taskId)).toHaveLength(1);
  });

  test('История удаляется каскадом только вместе с задачей', async () => {
    const { m, e1, taskId } = await setup();
    await changeStatus(e1, taskId, 'in_progress');

    const { error } = await m.from('tasks').delete().eq('id', taskId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from('task_status_history')
      .select('id')
      .eq('task_id', taskId);
    expect(data).toEqual([]);
  });
});

test.describe('Гонки (спек task-workflow)', () => {
  test('Два одновременных одинаковых перехода: проходит один, второй отклоняется', async () => {
    const { m, e1, taskId } = await setup();

    const results = await Promise.all([
      changeStatus(e1, taskId, 'in_progress'),
      changeStatus(e1, taskId, 'in_progress'),
    ]);

    const failed = results.filter((r) => r.error);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.error?.message).toBe('transition_not_allowed');
    expect(await historyOf(m, taskId)).toHaveLength(1);
  });
});
