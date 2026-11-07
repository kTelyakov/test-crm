import type { SupabaseClient } from '@supabase/supabase-js';

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'done' | 'rework';

/** Вызов функции смены статуса (так её вызывает и бэкенд, и прямой запрос клиента). */
export function changeStatus(
  client: SupabaseClient,
  taskId: string,
  toStatus: TaskStatus,
  comment?: string | null,
) {
  return client.rpc('change_task_status', {
    p_task_id: taskId,
    p_to_status: toStatus,
    p_comment: comment ?? null,
  });
}

export async function statusOf(client: SupabaseClient, taskId: string): Promise<TaskStatus> {
  const { data, error } = await client.from('tasks').select('status').eq('id', taskId).single();
  if (error) throw new Error(error.message);
  return data.status as TaskStatus;
}

export async function historyOf(client: SupabaseClient, taskId: string) {
  const { data, error } = await client
    .from('task_status_history')
    .select('from_status, to_status, changed_by, comment, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
