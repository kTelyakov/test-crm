import { Link, useNavigate, useParams } from 'react-router-dom';
import { useIsManager } from '@/entities/user';
import { DeleteSiteButton } from '@/features/site-delete';
import { EditSiteButton } from '@/features/site-form';
import { CreateTaskButton } from '@/features/task-form';
import { useGetSite, useListSiteTasks } from '@/shared/api';
import { TaskList } from '@/widgets/task-list';

export function SiteDetailsPage() {
  const { siteId = '' } = useParams();
  const navigate = useNavigate();
  const isManager = useIsManager();
  const site = useGetSite(siteId);
  const tasks = useListSiteTasks(siteId);

  if (site.isPending) return <p className="text-slate-500">Загрузка…</p>;
  if (site.isError) {
    return (
      <p role="alert" className="text-red-600">
        Объект не найден или недоступен
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <Link to="/sites" className="text-sm text-blue-700 hover:underline">
        ← Все объекты
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{site.data.name}</h1>
          <p className="text-slate-600">{site.data.address}</p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <EditSiteButton site={site.data} />
            <DeleteSiteButton site={site.data} onDeleted={() => navigate('/sites')} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Задачи</h2>
        {isManager && <CreateTaskButton siteId={siteId} />}
      </div>
      {tasks.isPending && <p className="text-slate-500">Загрузка…</p>}
      {tasks.data && <TaskList tasks={tasks.data} emptyText="Задач пока нет" />}
    </section>
  );
}
