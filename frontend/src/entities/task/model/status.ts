import type { TaskStatus } from '@/shared/api';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Принята',
  rework: 'На доработке',
};

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  new: 'neutral',
  in_progress: 'info',
  review: 'warning',
  done: 'success',
  rework: 'danger',
};

/** Подписи кнопок действий; действие определяется статусом, в который переводится задача. */
export const ACTION_LABEL: Record<TaskStatus, string> = {
  new: 'Вернуть в «Новая»',
  in_progress: 'Взять в работу',
  review: 'Отправить на проверку',
  done: 'Принять',
  rework: 'Вернуть на доработку',
};
