import type { User } from '../../identity/domain/user';
import type { TaskStatus } from '../domain/task';
import type { TaskRepository } from './ports';
import type { TaskCard, TaskCardAssembler } from './task-card';

/**
 * Смена статуса. Допустимость перехода, роль, назначенного исполнителя и обязательный комментарий
 * проверяет функция БД `change_task_status` и тут же пишет историю — одной транзакцией.
 * Use case только вызывает её (ошибки БД репозиторий переводит в доменные) и собирает обновлённую карточку.
 */
export class ChangeTaskStatus {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly cards: TaskCardAssembler,
  ) {}

  async execute(
    input: { taskId: string; toStatus: TaskStatus; comment?: string | null },
    user: User,
  ): Promise<TaskCard> {
    const comment = input.comment?.trim() || null;
    await this.tasks.changeStatus(input.taskId, input.toStatus, comment);
    return this.cards.byId(input.taskId, user);
  }
}
