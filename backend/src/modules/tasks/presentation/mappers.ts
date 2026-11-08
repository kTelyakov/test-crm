import type { z } from 'zod';
import type { TaskCard } from '../application/task-card';
import type { Task } from '../domain/task';
import type { taskCardSchema, taskSchema } from './dto';

/** DTO отделены от доменных сущностей: наружу уходит только то, что описано в контракте. */
export function toTaskDto(task: Task): z.infer<typeof taskSchema> {
  return {
    id: task.id,
    siteId: task.siteId,
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: { id: task.assigneeId, fullName: task.assigneeName },
    createdBy: task.createdBy,
    createdAt: task.createdAt,
  };
}

export function toTaskCardDto(card: TaskCard): z.infer<typeof taskCardSchema> {
  return {
    ...toTaskDto(card.task),
    availableActions: card.availableActions,
    history: card.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedBy: { id: entry.changedBy, fullName: entry.changedByName },
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
  };
}
