import type { User } from '../../identity/domain/user';
import type { Task, TaskStatus } from './task';
import type { TransitionRule } from './transition-rule';

/** Действие, которое пользователь может выполнить над задачей прямо сейчас. */
export interface TaskAction {
  toStatus: TaskStatus;
  requiresComment: boolean;
}

/**
 * Какие переходы доступны пользователю. Это подсказка для интерфейса: решение о допустимости
 * перехода всё равно принимает база данных (функция `change_task_status`) по тем же правилам.
 */
export function availableActions(task: Task, user: User, rules: TransitionRule[]): TaskAction[] {
  return rules
    .filter(
      (rule) =>
        rule.fromStatus === task.status &&
        rule.actorRole === user.role &&
        (!rule.requiresAssignee || task.assigneeId === user.id),
    )
    .map((rule) => ({ toStatus: rule.toStatus, requiresComment: rule.requiresComment }));
}
