import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from '../../../shared/config';

const authOptions = { autoRefreshToken: false, persistSession: false } as const;

/**
 * Клиент Supabase от имени пользователя: токен передаётся в каждый запрос, поэтому
 * RLS и права БД применяются к нему так же, как при прямом обращении. Ключа service_role бэкенд не знает.
 */
export function createUserClient(config: Config, token: string): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: authOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function createAnonClient(config: Config): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, { auth: authOptions });
}
