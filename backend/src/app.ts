import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate } from './modules/identity/presentation/authenticate';
import { identityRoutes } from './modules/identity/presentation/routes';
import type { Session } from './modules/identity/presentation/session';
import type { Config } from './shared/config';
import { errorHandler } from './shared/error-handler';

/** Собирает приложение. Отдельно от `listen`, чтобы им можно было пользоваться и в тестах, и при генерации OpenAPI. */
export async function buildApp(config: Config) {
  const app = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  await app.register(cors, { origin: config.FRONTEND_ORIGIN.split(',') });
  await app.register(swagger, {
    openapi: {
      info: { title: 'Мини-CRM «Объекты и задачи»', version: '1.0.0' },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
    transform: jsonSchemaTransform,
  });

  app.get(
    '/health',
    { schema: { response: { 200: z.object({ status: z.literal('ok') }) } } },
    async () => ({ status: 'ok' as const }),
  );

  // Все остальные маршруты требуют входа: пользователь определяется по токену.
  await app.register(async (protectedApp) => {
    protectedApp.decorateRequest('session', null as unknown as Session);
    protectedApp.addHook('onRequest', authenticate(config));
    await protectedApp.register(identityRoutes);
  });

  return app;
}
