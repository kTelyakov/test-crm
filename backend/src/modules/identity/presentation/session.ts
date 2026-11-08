import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../domain/user';

/** Контекст запроса: кто обращается и клиент БД от его имени. */
export interface Session {
  user: User;
  db: SupabaseClient;
}

declare module 'fastify' {
  interface FastifyRequest {
    session: Session;
  }
}
