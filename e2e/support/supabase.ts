import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, serviceRoleKey } from './env';
import type { TestUser } from './users';

/** Клиент Supabase с токеном пользователя: так выглядит прямой запрос в обход интерфейса. */
export async function clientFor(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: env.testUserPassword,
  });
  if (error) throw new Error(`Не удалось войти как ${user.email}: ${error.message}`);
  return client;
}

/** Клиент без входа (роль anon). */
export function anonClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Клиент с ключом service_role: обходит RLS. Используется ТОЛЬКО для подготовки данных в тестах
 * (например, чтобы создать задачу в нужном статусе); проверяемые действия выполняются клиентами ролей.
 */
export function adminClient(): SupabaseClient {
  if (!serviceRoleKey) throw new Error('Для этого теста нужен SUPABASE_SERVICE_ROLE_KEY в .env');
  return createClient(env.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
