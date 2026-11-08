import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../../../shared/error-schema';
import { CreateSite, DeleteSite, GetSite, ListSites, UpdateSite } from '../application/use-cases';
import { SupabaseSiteRepository } from '../infrastructure/supabase-site-repository';
import { createSiteBodySchema, siteIdParamsSchema, siteSchema, updateSiteBodySchema } from './dto';

const secured = { tags: ['sites'], security: [{ bearerAuth: [] }] };
const errors = { 400: errorResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema };

export async function sitesRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const repository = (request: FastifyRequest) => new SupabaseSiteRepository(request.session.db);

  api.get(
    '/sites',
    {
      schema: {
        ...secured,
        summary: 'Список объектов (исполнитель видит только свои)',
        response: { 200: z.array(siteSchema), ...errors },
      },
    },
    (request) => new ListSites(repository(request)).execute(),
  );

  api.get(
    '/sites/:id',
    {
      schema: {
        ...secured,
        summary: 'Карточка объекта',
        params: siteIdParamsSchema,
        response: { 200: siteSchema, 404: errorResponseSchema, ...errors },
      },
    },
    (request) => new GetSite(repository(request)).execute(request.params.id),
  );

  api.post(
    '/sites',
    {
      schema: {
        ...secured,
        summary: 'Создать объект (постановщик)',
        body: createSiteBodySchema,
        response: { 201: siteSchema, ...errors },
      },
    },
    async (request, reply) => {
      const site = await new CreateSite(repository(request)).execute(request.body);
      return reply.status(201).send(site);
    },
  );

  api.patch(
    '/sites/:id',
    {
      schema: {
        ...secured,
        summary: 'Изменить объект (постановщик)',
        params: siteIdParamsSchema,
        body: updateSiteBodySchema,
        response: { 200: siteSchema, 404: errorResponseSchema, ...errors },
      },
    },
    (request) => new UpdateSite(repository(request)).execute(request.params.id, request.body),
  );

  api.delete(
    '/sites/:id',
    {
      schema: {
        ...secured,
        summary: 'Удалить объект без задач (постановщик)',
        params: siteIdParamsSchema,
        response: {
          204: z.null(),
          404: errorResponseSchema,
          409: errorResponseSchema,
          ...errors,
        },
      },
    },
    async (request, reply) => {
      await new DeleteSite(repository(request)).execute(request.params.id);
      return reply.status(204).send(null);
    },
  );
}
