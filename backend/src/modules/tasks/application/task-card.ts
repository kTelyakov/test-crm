import { DomainError } from '../../../shared/domain-error';
import type { User } from '../../identity/domain/user';
import { availableActions, type TaskAction } from '../domain/available-actions';
import type { Task, TaskHistoryEntry } from '../domain/task';
import type { TaskRepository, TransitionRuleRepository } from './ports';

/** Задача так, как её показывает карточка: с историей и действиями, доступными именно этому пользователю. */
export interface TaskCard {
  task: Task;
  availableActions: TaskAction[];
  history: TaskHistoryEntry[];
}

export class TaskCardAssembler {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly rules: TransitionRuleRepository,
  ) {}

  /** Загружает задачу по id; чужая или несуществующая задача для пользователя выглядит одинаково — как «не найдена». */
  async byId(id: string, user: User): Promise<TaskCard> {
    const task = await this.tasks.findById(id);
    if (!task) throw new DomainError('not_found', 'Задача не найдена');
    return this.assemble(task, user);
  }

  async assemble(task: Task, user: User): Promise<TaskCard> {
    const [rules, history] = await Promise.all([this.rules.all(), this.tasks.history(task.id)]);
    return { task, availableActions: availableActions(task, user, rules), history };
  }
}
