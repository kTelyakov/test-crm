import type { SupabaseClient } from '@supabase/supabase-js';
import { toDomainError } from '../../../shared/db-errors';
import { DomainError } from '../../../shared/domain-error';
import type { NewTask, TaskChanges, TaskRepository } from '../application/ports';
import type { Task, TaskHistoryEntry, TaskStatus } from '../domain/task';

interface TaskRow {
  id: string;
  site_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string;
  created_by: string;
  created_at: string;
  assignee: { full_name: string } | null;
}

interface HistoryRow {
  id: string;
  from_status: TaskStatus;
  to_status: TaskStatus;
  changed_by: string;
  comment: string | null;
  created_at: string;
  author: { full_name: string } | null;
}

// Две связи с profiles (исполнитель и автор), поэтому внешний ключ указан явно.
const TASK_COLUMNS =
  'id, site_id, title, description, status, assignee_id, created_by, created_at, assignee:profiles!tasks_assignee_id_fkey(full_name)';
const HISTORY_COLUMNS =
  'id, from_status, to_status, changed_by, comment, created_at, author:profiles!task_status_history_changed_by_fkey(full_name)';

const FOREIGN_KEY_VIOLATION = '23503';

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  siteId: row.site_id,
  title: row.title,
  description: row.description,
  status: row.status,
  assigneeId: row.assignee_id,
  assigneeName: row.assignee?.full_name ?? '',
  createdBy: row.created_by,
  createdAt: row.created_at,
});

const toHistoryEntry = (row: HistoryRow): TaskHistoryEntry => ({
  id: row.id,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  changedBy: row.changed_by,
  changedByName: row.author?.full_name ?? '',
  comment: row.comment,
  createdAt: row.created_at,
});

/** Все запросы идут с токеном пользователя: что он вправе видеть и менять, решает БД. */
export class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(filter: { siteId?: string; assigneeId?: string }): Promise<Task[]> {
    let query = this.db.from('tasks').select(TASK_COLUMNS).order('created_at');
    if (filter.siteId) query = query.eq('site_id', filter.siteId);
    if (filter.assigneeId) query = query.eq('assignee_id', filter.assigneeId);
    const { data, error } = await query;
    if (error) throw toDomainError(error);
    return (data as unknown as TaskRow[]).map(toTask);
  }

  async findById(id: string): Promise<Task | null> {
    const { data, error } = await this.db
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw toDomainError(error);
    return data ? toTask(data as unknown as TaskRow) : null;
  }

  async create(task: NewTask): Promise<Task> {
    const { data, error } = await this.db
      .from('tasks')
      .insert({
        site_id: task.siteId,
        title: task.title,
        description: task.description,
        assignee_id: task.assigneeId,
      })
      .select(TASK_COLUMNS)
      .single();
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      throw new DomainError('not_found', 'Объект или исполнитель не найден');
    }
    if (error) throw toDomainError(error);
    return toTask(data as unknown as TaskRow);
  }

  async update(id: string, changes: TaskChanges): Promise<Task | null> {
    const { data, error } = await this.db
      .from('tasks')
      .update({
        ...(changes.title !== undefined && { title: changes.title }),
        ...(changes.description !== undefined && { description: changes.description }),
        ...(changes.assigneeId !== undefined && { assignee_id: changes.assigneeId }),
      })
      .eq('id', id)
      .select(TASK_COLUMNS)
      .maybeSingle();
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      throw new DomainError('not_found', 'Исполнитель не найден');
    }
    if (error) throw toDomainError(error);
    return data ? toTask(data as unknown as TaskRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('tasks').delete().eq('id', id).select('id');
    if (error) throw toDomainError(error);
    return data.length > 0;
  }

  async changeStatus(id: string, toStatus: TaskStatus, comment: string | null): Promise<void> {
    const { error } = await this.db.rpc('change_task_status', {
      p_task_id: id,
      p_to_status: toStatus,
      p_comment: comment,
    });
    if (error) throw toDomainError(error);
  }

  async history(taskId: string): Promise<TaskHistoryEntry[]> {
    const { data, error } = await this.db
      .from('task_status_history')
      .select(HISTORY_COLUMNS)
      .eq('task_id', taskId)
      .order('created_at');
    if (error) throw toDomainError(error);
    return (data as unknown as HistoryRow[]).map(toHistoryEntry);
  }
}
