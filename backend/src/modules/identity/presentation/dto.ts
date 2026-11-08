import { z } from 'zod';

export const userSchema = z
  .object({
    id: z.uuid(),
    fullName: z.string(),
    role: z.enum(['manager', 'executor']),
  })
  .meta({ id: 'User' });
