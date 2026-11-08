import type { FastifyRequest } from 'fastify';
import type { Config } from '../../../shared/config';
import { ResolveCurrentUser } from '../application/resolve-current-user';
import { createAnonClient, createUserClient } from '../infrastructure/supabase-clients';
import { SupabaseTokenVerifier } from '../infrastructure/supabase-token-verifier';
import { SupabaseUserRepository } from '../infrastructure/supabase-user-repository';

const bearerToken = (header: string | undefined) => header?.match(/^Bearer (.+)$/i)?.[1];

/** Хук авторизации: кладёт в запрос пользователя и клиент БД с его токеном. Идентичность берётся только из токена. */
export function authenticate(config: Config) {
  const verifier = new SupabaseTokenVerifier(createAnonClient(config));

  return async (request: FastifyRequest) => {
    const token = bearerToken(request.headers.authorization);
    const db = createUserClient(config, token ?? '');
    const user = await new ResolveCurrentUser(verifier, new SupabaseUserRepository(db)).execute(
      token,
    );
    request.session = { user, db };
  };
}
