import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Введите название'),
  description: z.string().trim(),
  assigneeId: z.string().min(1, 'Выберите исполнителя'),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
