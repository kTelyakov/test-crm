import { expect, test } from '@playwright/test';
import pg from 'pg';
import { createSite, createTask, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { executor1, manager } from '../support/users';
import { changeStatus, historyOf, statusOf } from '../support/workflow';

// Прямое подключение к локальной базе нужно только для того, чтобы намеренно сломать запись истории.
const dbUrl = process.env['DB_URL'];

test.describe('Атомарность (спек task-workflow)', () => {
  test.skip(!dbUrl, 'Нужен DB_URL (прямое подключение к тестовой базе)');

  test('Если запись истории не удалась, статус задачи остаётся прежним', async () => {
    const m = await clientFor(manager);
    const e1 = await clientFor(executor1);
    const site = await createSite(m);
    const task = await createTask(m, site.id, await userIdOf(e1));

    const db = new pg.Client({ connectionString: dbUrl });
    await db.connect();
    try {
      // Намеренно ломаем вставку в историю.
      await db.query(`
        create function public.test_break_history() returns trigger language plpgsql as
        $$ begin raise exception 'history_insert_failed'; end; $$;
        create trigger test_break_history before insert on public.task_status_history
          for each row execute function public.test_break_history();
      `);

      const { error } = await changeStatus(e1, task.id, 'in_progress');

      expect(error?.message).toContain('history_insert_failed');
      expect(await statusOf(m, task.id)).toBe('new');
      expect(await historyOf(m, task.id)).toEqual([]);
    } finally {
      await db.query(`
        drop trigger if exists test_break_history on public.task_status_history;
        drop function if exists public.test_break_history();
      `);
      await db.end();
    }
  });
});
