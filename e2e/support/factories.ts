import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { adminClient } from './supabase';
import type { TestUser } from './users';

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
    title: string;
    status: string;
    created_by: string;
    created_at: string;
    assignee_id: string;
  };
}

/**
 * Новый исполнитель без задач. Создаётся через service_role — это подготовка данных, как и сид;
 * проверяемые действия затем выполняются от его имени.
 */
export async function createExecutor(): Promise<TestUser> {
  const admin = adminClient();
  const email = `${unique('newcomer')}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: env.testUserPassword,
    email_confirm: true,
  });
  if (error) throw new Error(`Не удалось создать пользователя: ${error.message}`);
  const profile = await admin
    .from('profiles')
    .insert({ id: data.user.id, full_name: 'Новый Исполнитель', role: 'executor' });
  if (profile.error) throw new Error(`Не удалось создать профиль: ${profile.error.message}`);
  return { email, role: 'executor' };
}
