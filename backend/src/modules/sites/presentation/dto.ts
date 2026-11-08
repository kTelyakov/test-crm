import { z } from 'zod';

export const siteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string(),
  createdAt: z.string(),
});

/** Название и адрес обязательны; пробелы по краям отбрасываются. */
const requiredText = z.string().trim().min(1, 'Поле обязательно');

export const createSiteBodySchema = z.object({
  name: requiredText,
  address: requiredText,
});

export const updateSiteBodySchema = createSiteBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Нужно передать хотя бы одно поле');

export const siteIdParamsSchema = z.object({ id: z.uuid() });
