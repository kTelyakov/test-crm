import { useListMyTasks } from '@/shared/api';
import { TaskList } from '@/widgets/task-list';

export function MyTasksPage() {
  const { data: tasks, isPending, isError } = useListMyTasks();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Мои задачи</h1>
      {isPending && <p className="text-slate-500">Загрузка…</p>}
      {isError && (
        <p role="alert" className="text-red-600">
          Не удалось загрузить задачи
        </p>
      )}
      {tasks && <TaskList tasks={tasks} emptyText="Вам пока не назначено задач" />}
    </section>
  );
}
