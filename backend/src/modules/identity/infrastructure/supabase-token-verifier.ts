import type { SupabaseClient } from '@supabase/supabase-js';
import type { TokenVerifier } from '../application/ports';

/** Проверка токена сервисом Supabase Auth (подпись, срок действия, существование пользователя). */
export class SupabaseTokenVerifier implements TokenVerifier {
  constructor(private readonly anon: SupabaseClient) {}

  async verify(token: string): Promise<string | null> {
    const { data, error } = await this.anon.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  }
}
