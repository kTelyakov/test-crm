import { Link, useNavigate, useParams } from 'react-router-dom';
import { TaskStatusBadge } from '@/entities/task';
import { useIsManager } from '@/entities/user';
import { DeleteTaskButton } from '@/features/task-delete';
import { TaskStatusActions } from '@/features/task-change-status';
import { EditTaskButton } from '@/features/task-form';
import { useGetTask } from '@/shared/api';
import { TaskHistory } from '@/widgets/task-history';

export function TaskDetailsPage() {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const isManager = useIsManager();
  const { data: task, isPending, isError } = useGetTask(taskId);

  if (isPending) return <p className="text-slate-500">Загрузка…</p>;
  if (isError) {
    return (
      <p role="alert" className="text-red-600">
        Задача не найдена или недоступна
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <Link to={`/sites/${task.siteId}`} className="text-sm text-blue-700 hover:underline">
        ← К объекту
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <p className="text-slate-600">Исполнитель: {task.assignee.fullName}</p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>
      <p className="whitespace-pre-wrap">{task.description || 'Описание не заполнено'}</p>
      <TaskStatusActions task={task} />
      {isManager && (
        <div className="flex gap-2">
          <EditTaskButton task={task} />
          <DeleteTaskButton task={task} onDeleted={() => navigate(`/sites/${task.siteId}`)} />
        </div>
      )}
      <div className="space-y-2">
        <h2 className="font-medium">История</h2>
        <TaskHistory entries={task.history} />
      </div>
    </section>
  );
}
