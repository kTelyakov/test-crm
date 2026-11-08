import { STATUS_LABEL } from '@/entities/task';
import type { TaskHistoryEntry } from '@/shared/api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

/** История смены статусов: кто, когда, откуда и куда перевёл задачу, и комментарий. */
export function TaskHistory({ entries }: { entries: TaskHistoryEntry[] }) {
  if (entries.length === 0) return <p className="text-slate-500">Статус ещё не менялся</p>;

  return (
    <ol className="space-y-3" aria-label="История статусов">
      {entries.map((entry) => (
        <li key={entry.id} className="border-l-2 border-slate-300 pl-3 text-sm">
          <p>
            <span className="font-medium">{entry.changedBy.fullName}</span>:{' '}
            {STATUS_LABEL[entry.fromStatus]} → {STATUS_LABEL[entry.toStatus]}
          </p>
          <p className="text-slate-500">{formatDate(entry.createdAt)}</p>
          {entry.comment && <p className="mt-1 text-slate-800">Комментарий: {entry.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
