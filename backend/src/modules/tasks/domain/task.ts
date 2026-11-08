export const TASK_STATUSES = ['new', 'in_progress', 'review', 'done', 'rework'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  siteId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  assigneeName: string;
  createdBy: string;
  createdAt: string;
}

/** Запись неизменяемой истории смены статуса. */
export interface TaskHistoryEntry {
  id: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string;
  changedByName: string;
  comment: string | null;
  createdAt: string;
}
