import type { Role } from '../../identity/domain/user';
import type { TaskStatus } from './task';

/**
 * Правило перехода статуса. Источник правил — таблица `task_transitions` в БД:
 * база их исполняет, бэкенд только читает, чтобы показать доступные действия.
 */
export interface TransitionRule {
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  actorRole: Role;
  requiresAssignee: boolean;
  requiresComment: boolean;
}
