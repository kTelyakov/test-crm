import type { SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '../../identity/domain/user';
import { toDomainError } from '../../../shared/db-errors';
import type { TransitionRuleRepository } from '../application/ports';
import type { TaskStatus } from '../domain/task';
import type { TransitionRule } from '../domain/transition-rule';

interface RuleRow {
  from_status: TaskStatus;
  to_status: TaskStatus;
  actor_role: Role;
  requires_assignee: boolean;
  requires_comment: boolean;
}

/** Читает правила переходов из таблицы `task_transitions` — того же источника, который использует база. */
export class SupabaseTransitionRuleRepository implements TransitionRuleRepository {
  constructor(private readonly db: SupabaseClient) {}

  async all(): Promise<TransitionRule[]> {
    const { data, error } = await this.db.from('task_transitions').select('*');
    if (error) throw toDomainError(error);
    return (data as RuleRow[]).map((row) => ({
      fromStatus: row.from_status,
      toStatus: row.to_status,
      actorRole: row.actor_role,
      requiresAssignee: row.requires_assignee,
      requiresComment: row.requires_comment,
    }));
  }
}
