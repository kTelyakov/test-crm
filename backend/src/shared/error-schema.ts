import { z } from 'zod';

/** Формат ошибки API, общий для всех маршрутов (попадает в OpenAPI). */
export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});
