import { createClient } from '@supabase/supabase-js';
import { env } from '@/shared/config';

/** Клиент Supabase используется только для входа/выхода и хранения сессии; данные запрашиваются через бэкенд. */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
