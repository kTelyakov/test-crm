import type { SupabaseClient } from '@supabase/supabase-js';

let counter = 0;
/** Уникальный суффикс, чтобы тесты не зависели друг от друга. */
export const unique = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

export async function userIdOf(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Нет авторизованного пользователя');
  return data.user.id;
}

export async function createSite(manager: SupabaseClient) {
  const { data, error } = await manager
    .from('sites')
    .insert({ name: unique('Объект'), address: 'ул. Тестовая, 1' })
    .select()
    .single();
  if (error) throw new Error(`Не удалось создать объект: ${error.message}`);
  return data as { id: string; name: string; address: string };
}

export async function createTask(manager: SupabaseClient, siteId: string, assigneeId: string) {
  const { data, error } = await manager
    .from('tasks')
    .insert({
      site_id: siteId,
      title: unique('Задача'),
      description: 'Описание',
      assignee_id: assigneeId,
    })
    .select()
    .single();
  if (error) throw new Error(`Не удалось создать задачу: ${error.message}`);
  return data as {
    id: string;
    status: string;
    created_by: string;
    created_at: string;
    assignee_id: string;
  };
}
