import type { UserRepository } from './ports';

/** Исполнители, которых постановщик может назначить на задачу. */
export class ListExecutors {
  constructor(private readonly users: UserRepository) {}

  execute() {
    return this.users.listExecutors();
  }
}
