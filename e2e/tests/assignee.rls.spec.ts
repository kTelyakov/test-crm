import { expect, test } from '@playwright/test';
import { createSite, createTask, unique, userIdOf } from '../support/factories';
import { adminClient, clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

test.describe('Назначение исполнителя (спек tasks)', () => {
  test('Создание задачи с исполнителем', async () => {
    const m = await clientFor(manager);
    const e1Id = await userIdOf(await clientFor(executor1));
    const site = await createSite(m);

    const task = await createTask(m, site.id, e1Id);

    expect(task.assignee_id).toBe(e1Id);
  });

  test('Назначать можно только исполнителя: при создании', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);

    const { error } = await m
      .from('tasks')
      .insert({ site_id: site.id, title: unique('Задача'), assignee_id: await userIdOf(m) });

    expect(error?.message).toContain('assignee_must_be_executor');
  });

  test('Назначать можно только исполнителя: при смене исполнителя', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(await clientFor(executor1)));

    const { error } = await m
      .from('tasks')
      .update({ assignee_id: await userIdOf(m) })
      .eq('id', task.id);

    expect(error?.message).toContain('assignee_must_be_executor');
  });
});

test.describe('Смена исполнителя (спек tasks)', () => {
  test('Смена исполнителя у новой задачи', async () => {
    const m = await clientFor(manager);
    const e2Id = await userIdOf(await clientFor(executor2));
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(await clientFor(executor1)));

    const { error } = await m.from('tasks').update({ assignee_id: e2Id }).eq('id', task.id);

    expect(error).toBeNull();
    const { data } = await m.from('tasks').select('assignee_id').eq('id', task.id).single();
    expect(data?.assignee_id).toBe(e2Id);
  });

  test('Смена исполнителя у задачи на доработке', async () => {
    const m = await clientFor(manager);
    const e2Id = await userIdOf(await clientFor(executor2));
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(await clientFor(executor1)));
    await adminClient().from('tasks').update({ status: 'rework' }).eq('id', task.id);

    const { error } = await m.from('tasks').update({ assignee_id: e2Id }).eq('id', task.id);

    expect(error).toBeNull();
  });

  for (const status of ['in_progress', 'review', 'done']) {
    test(`Смена исполнителя у задачи в статусе «${status}» отклоняется`, async () => {
      const m = await clientFor(manager);
      const e1Id = await userIdOf(await clientFor(executor1));
      const e2Id = await userIdOf(await clientFor(executor2));
      const site = await createSite(m);
      const task = await createTask(m, site.id, e1Id);
      await adminClient().from('tasks').update({ status }).eq('id', task.id);

      const { error } = await m.from('tasks').update({ assignee_id: e2Id }).eq('id', task.id);

      expect(error?.message).toContain('assignee_change_not_allowed');
      const { data } = await m.from('tasks').select('assignee_id').eq('id', task.id).single();
      expect(data?.assignee_id).toBe(e1Id);
    });
  }
});
