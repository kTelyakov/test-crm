import { DomainError } from '../../../shared/domain-error';
import type { User } from '../../identity/domain/user';
import type { Task } from '../domain/task';
import type { NewTask, TaskChanges, TaskRepository } from './ports';
import type { TaskCard, TaskCardAssembler } from './task-card';

export class ListSiteTasks {
  constructor(private readonly tasks: TaskRepository) {}
  /** Исполнитель получит только свои задачи объекта — отбирает RLS. */
  execute(siteId: string): Promise<Task[]> {
    return this.tasks.list({ siteId });
  }
}

export class ListMyTasks {
  constructor(private readonly tasks: TaskRepository) {}
  execute(user: User): Promise<Task[]> {
    return this.tasks.list({ assigneeId: user.id });
  }
}

export class GetTask {
  constructor(private readonly cards: TaskCardAssembler) {}
  execute(id: string, user: User): Promise<TaskCard> {
    return this.cards.byId(id, user);
  }
}

export class CreateTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly cards: TaskCardAssembler,
  ) {}
  async execute(input: NewTask, user: User): Promise<TaskCard> {
    return this.cards.assemble(await this.tasks.create(input), user);
  }
}

export class UpdateTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly cards: TaskCardAssembler,
  ) {}
  async execute(id: string, changes: TaskChanges, user: User): Promise<TaskCard> {
    const task = await this.tasks.update(id, changes);
    if (!task) throw new DomainError('not_found', 'Задача не найдена');
    return this.cards.assemble(task, user);
  }
}

export class DeleteTask {
  constructor(private readonly tasks: TaskRepository) {}
  async execute(id: string): Promise<void> {
    if (!(await this.tasks.delete(id))) throw new DomainError('not_found', 'Задача не найдена');
  }
}
