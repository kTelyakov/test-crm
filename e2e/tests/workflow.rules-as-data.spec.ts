import { expect, test } from '@playwright/test';
import { createSite, createTask, userIdOf } from '../support/factories';
import { adminClient, clientFor } from '../support/supabase';
import { executor1, manager } from '../support/users';
import { changeStatus, statusOf } from '../support/workflow';

test.describe('Правила переходов хранятся как данные (спек task-workflow)', () => {
  test('Изменение правила в таблице меняет проверку в базе без правки кода', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const admin = adminClient();
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(e1));
    await changeStatus(e1, task.id, 'in_progress');
    await changeStatus(e1, task.id, 'review');

    const rule = admin.from('task_transitions').update({ requires_comment: false });
    const match = { from_status: 'review', to_status: 'rework' } as const;
    try {
      await rule.match(match);

      // Комментарий для возврата больше не нужен: то же действие теперь проходит.
      const { error } = await changeStatus(m, task.id, 'rework');

      expect(error).toBeNull();
      expect(await statusOf(m, task.id)).toBe('rework');
    } finally {
      await admin.from('task_transitions').update({ requires_comment: true }).match(match);
    }
  });
});
