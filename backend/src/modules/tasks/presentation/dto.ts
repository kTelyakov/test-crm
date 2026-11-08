import { z } from 'zod';
import { TASK_STATUSES } from '../domain/task';

const statusSchema = z.enum(TASK_STATUSES).meta({ id: 'TaskStatus' });

export const taskSchema = z
  .object({
    id: z.uuid(),
    siteId: z.uuid(),
    title: z.string(),
    description: z.string(),
    status: statusSchema,
    assignee: z.object({ id: z.uuid(), fullName: z.string() }),
    createdBy: z.uuid(),
    createdAt: z.string(),
  })
  .meta({ id: 'Task' });

export const taskActionSchema = z
  .object({
    toStatus: statusSchema,
    requiresComment: z.boolean(),
  })
  .meta({ id: 'TaskAction' });

export const historyEntrySchema = z
  .object({
    id: z.uuid(),
    fromStatus: statusSchema,
    toStatus: statusSchema,
    changedBy: z.object({ id: z.uuid(), fullName: z.string() }),
    comment: z.string().nullable(),
    createdAt: z.string(),
  })
  .meta({ id: 'TaskHistoryEntry' });

/** Карточка задачи: данные, действия, доступные текущему пользователю, и история статусов. */
export const taskCardSchema = taskSchema
  .extend({
    availableActions: z.array(taskActionSchema),
    history: z.array(historyEntrySchema),
  })
  .meta({ id: 'TaskCard' });

const requiredText = z.string().trim().min(1, 'Поле обязательно');

export const createTaskBodySchema = z
  .object({
    siteId: z.uuid(),
    title: requiredText,
    description: z.string().trim().default(''),
    assigneeId: z.uuid(),
  })
  .meta({ id: 'CreateTaskBody' });

export const updateTaskBodySchema = z
  .object({
    title: requiredText,
    description: z.string().trim(),
    assigneeId: z.uuid(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Нужно передать хотя бы одно поле')
  .meta({ id: 'UpdateTaskBody' });

export const taskIdParamsSchema = z.object({ id: z.uuid() });

export const changeStatusBodySchema = z
  .object({
    toStatus: statusSchema,
    comment: z.string().trim().nullish(),
  })
  .meta({ id: 'ChangeStatusBody' });
