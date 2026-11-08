import type { Task, TaskHistoryEntry, TaskStatus } from '../domain/task';
import type { TransitionRule } from '../domain/transition-rule';

export interface NewTask {
  siteId: string;
  title: string;
  description: string;
  assigneeId: string;
}

export interface TaskChanges {
  title?: string;
  description?: string;
  assigneeId?: string;
}

export interface TaskRepository {
  list(filter: { siteId?: string; assigneeId?: string }): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  create(task: NewTask): Promise<Task>;
  /** `null`, если задачи нет или она недоступна пользователю. */
  update(id: string, changes: TaskChanges): Promise<Task | null>;
  /** `false`, если задачи нет или она недоступна пользователю. */
  delete(id: string): Promise<boolean>;
  /** Смена статуса целиком выполняется функцией БД: проверка правил и запись истории. */
  changeStatus(id: string, toStatus: TaskStatus, comment: string | null): Promise<void>;
  history(taskId: string): Promise<TaskHistoryEntry[]>;
}

export interface TransitionRuleRepository {
  all(): Promise<TransitionRule[]>;
}
