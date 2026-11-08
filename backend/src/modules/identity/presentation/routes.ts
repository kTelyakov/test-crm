import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../../../shared/error-schema';
import { ListExecutors } from '../application/list-executors';
import { SupabaseUserRepository } from '../infrastructure/supabase-user-repository';
import { userSchema } from './dto';

export async function identityRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    '/me',
    {
      schema: {
        tags: ['identity'],
        summary: 'Текущий пользователь и его роль',
        security: [{ bearerAuth: [] }],
        response: { 200: userSchema, 401: errorResponseSchema },
      },
    },
    async (request) => request.session.user,
  );

  api.get(
    '/executors',
    {
      schema: {
        tags: ['identity'],
        summary: 'Исполнители, которых можно назначить на задачу',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(userSchema), 401: errorResponseSchema },
      },
    },
    async (request) => new ListExecutors(new SupabaseUserRepository(request.session.db)).execute(),
  );
}
