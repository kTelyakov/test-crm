import { Link } from 'react-router-dom';
import { TaskStatusBadge } from '@/entities/task';
import type { Task } from '@/shared/api';
import { Card } from '@/shared/ui';

interface TaskListProps {
  tasks: Task[];
  emptyText: string;
}

/** Список задач со статусами; каждая строка ведёт в карточку задачи. */
export function TaskList({ tasks, emptyText }: TaskListProps) {
  if (tasks.length === 0) return <p className="text-slate-500">{emptyText}</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link to={`/tasks/${task.id}`} className="block">
            <Card className="flex items-center justify-between gap-3 transition-colors hover:border-blue-400">
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-slate-600">Исполнитель: {task.assignee.fullName}</p>
              </div>
              <TaskStatusBadge status={task.status} />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
