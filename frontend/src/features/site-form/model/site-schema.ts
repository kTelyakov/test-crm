import { z } from 'zod';

export const siteSchema = z.object({
  name: z.string().trim().min(1, 'Введите название'),
  address: z.string().trim().min(1, 'Введите адрес'),
});

export type SiteFormValues = z.infer<typeof siteSchema>;
