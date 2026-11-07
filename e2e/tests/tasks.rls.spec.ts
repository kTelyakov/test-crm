import { expect, test } from '@playwright/test';
import { createSite, createTask, unique, userIdOf } from '../support/factories';
import { anonClient, clientFor } from '../support/supabase';
import { executor1, executor2, manager } from '../support/users';

test.describe('Задачи: создание (спек tasks)', () => {
  test('Создание задачи: статус «Новая», автор и дата проставлены системой', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const e1Id = await userIdOf(await clientFor(executor1));

    const task = await createTask(m, site.id, e1Id);

    expect(task.status).toBe('new');
    expect(task.created_by).toBe(await userIdOf(m));
    expect(task.assignee_id).toBe(e1Id);
    expect(task.created_at).toBeTruthy();
  });

  test('Название обязательно', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const e1Id = await userIdOf(await clientFor(executor1));

    const { error } = await m
      .from('tasks')
      .insert({ site_id: site.id, title: ' ', assignee_id: e1Id });

    expect(error).not.toBeNull();
  });

  test('Попытка задать статус при создании отклоняется', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const e1Id = await userIdOf(await clientFor(executor1));

    const { error } = await m
      .from('tasks')
      .insert({ site_id: site.id, title: unique('Задача'), assignee_id: e1Id, status: 'done' });

    expect(error).not.toBeNull();
  });

  test('Попытка задать чужого автора при создании отклоняется', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const e1Id = await userIdOf(await clientFor(executor1));

    const { error } = await m
      .from('tasks')
      .insert({ site_id: site.id, title: unique('Задача'), assignee_id: e1Id, created_by: e1Id });

    expect(error).not.toBeNull();
  });
});

test.describe('Задачи: редактирование и удаление (спек tasks)', () => {
  test('Постановщик редактирует название и описание, статус не меняется', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(await clientFor(executor1)));

    const { error } = await m
      .from('tasks')
      .update({ title: 'Новое название', description: 'Новое описание' })
      .eq('id', task.id);

    expect(error).toBeNull();
    const { data } = await m.from('tasks').select('title, status').eq('id', task.id).single();
    expect(data).toEqual({ title: 'Новое название', status: 'new' });
  });

  test('Исполнитель не может изменить или удалить задачу', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(e1));

    const updated = await e1.from('tasks').update({ title: 'Взлом' }).eq('id', task.id).select();
    const deleted = await e1.from('tasks').delete().eq('id', task.id).select();

    expect(updated.data ?? []).toEqual([]);
    expect(deleted.data ?? []).toEqual([]);
    const { data } = await m.from('tasks').select('title').eq('id', task.id).single();
    expect(data?.title).not.toBe('Взлом');
  });

  test('Прямое изменение статуса обычным обновлением отклоняется', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(await clientFor(executor1)));

    const { error } = await m.from('tasks').update({ status: 'done' }).eq('id', task.id);

    expect(error).not.toBeNull();
    const { data } = await m.from('tasks').select('status').eq('id', task.id).single();
    expect(data?.status).toBe('new');
  });
});

test.describe('Задачи: видимость в обход интерфейса (спек tasks)', () => {
  test('Исполнитель напрямую запрашивает все задачи и получает только свои', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const e2 = await clientFor(executor2);
    const e1Id = await userIdOf(e1);
    const site = await createSite(m);
    await createTask(m, site.id, e1Id);
    await createTask(m, site.id, await userIdOf(e2));

    const { data } = await e1.from('tasks').select('assignee_id');

    expect(data?.length).toBeGreaterThan(0);
    expect((data ?? []).every((t) => t.assignee_id === e1Id)).toBe(true);
  });

  test('Исполнитель запрашивает чужую задачу: она не возвращается', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const site = await createSite(m);
    const foreign = await createTask(m, site.id, await userIdOf(await clientFor(executor2)));

    const { data } = await e1.from('tasks').select('id').eq('id', foreign.id);

    expect(data).toEqual([]);
  });

  test('Постановщик видит задачи всех исполнителей', async () => {
    const m = await clientFor(manager);
    const site = await createSite(m);
    const t1 = await createTask(m, site.id, await userIdOf(await clientFor(executor1)));
    const t2 = await createTask(m, site.id, await userIdOf(await clientFor(executor2)));

    const { data } = await m.from('tasks').select('id').in('id', [t1.id, t2.id]);

    expect(data).toHaveLength(2);
  });

  test('Без входа задачи недоступны', async () => {
    const { data, error } = await anonClient().from('tasks').select('id');

    expect(data ?? []).toEqual([]);
    expect(error).not.toBeNull();
  });
});

test.describe('Правила переходов: доступ (спек task-workflow)', () => {
  test('Вошедший пользователь читает правила, изменить их не может', async () => {
    const m = await clientFor(manager);

    const { data } = await m.from('task_transitions').select('*');
    const inserted = await m
      .from('task_transitions')
      .insert({
        from_status: 'new',
        to_status: 'done',
        actor_role: 'manager',
        requires_assignee: false,
      });

    expect(data).toHaveLength(5);
    expect(inserted.error).not.toBeNull();
  });
});
