import { z } from 'zod';

export const siteSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    address: z.string(),
    createdAt: z.string(),
  })
  .meta({ id: 'Site' });

/** Название и адрес обязательны; пробелы по краям отбрасываются. */
const requiredText = z.string().trim().min(1, 'Поле обязательно');

export const createSiteBodySchema = z
  .object({
    name: requiredText,
    address: requiredText,
  })
  .meta({ id: 'CreateSiteBody' });

export const updateSiteBodySchema = createSiteBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Нужно передать хотя бы одно поле')
  .meta({ id: 'UpdateSiteBody' });

export const siteIdParamsSchema = z.object({ id: z.uuid() });
