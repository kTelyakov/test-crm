import { z } from 'zod';
import { TASK_STATUSES } from '../domain/task';

const statusSchema = z.enum(TASK_STATUSES);

export const taskSchema = z.object({
  id: z.uuid(),
  siteId: z.uuid(),
  title: z.string(),
  description: z.string(),
  status: statusSchema,
  assignee: z.object({ id: z.uuid(), fullName: z.string() }),
  createdBy: z.uuid(),
  createdAt: z.string(),
});

export const taskActionSchema = z.object({
  toStatus: statusSchema,
  requiresComment: z.boolean(),
});

export const historyEntrySchema = z.object({
  id: z.uuid(),
  fromStatus: statusSchema,
  toStatus: statusSchema,
  changedBy: z.object({ id: z.uuid(), fullName: z.string() }),
  comment: z.string().nullable(),
  createdAt: z.string(),
});

/** Карточка задачи: данные, действия, доступные текущему пользователю, и история статусов. */
export const taskCardSchema = taskSchema.extend({
  availableActions: z.array(taskActionSchema),
  history: z.array(historyEntrySchema),
});

const requiredText = z.string().trim().min(1, 'Поле обязательно');

export const createTaskBodySchema = z.object({
  siteId: z.uuid(),
  title: requiredText,
  description: z.string().trim().default(''),
  assigneeId: z.uuid(),
});

export const updateTaskBodySchema = z
  .object({
    title: requiredText,
    description: z.string().trim(),
    assigneeId: z.uuid(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Нужно передать хотя бы одно поле');

export const taskIdParamsSchema = z.object({ id: z.uuid() });

export const changeStatusBodySchema = z.object({
  toStatus: statusSchema,
  comment: z.string().trim().nullish(),
});
