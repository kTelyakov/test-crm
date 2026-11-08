import { SiteCard } from '@/entities/site';
import { useListSites } from '@/shared/api';

export function SitesPage() {
  const { data: sites, isPending, isError } = useListSites();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Объекты</h1>
      {isPending && <p className="text-slate-500">Загрузка…</p>}
      {isError && (
        <p role="alert" className="text-red-600">
          Не удалось загрузить объекты
        </p>
      )}
      {sites?.length === 0 && <p className="text-slate-500">Объектов пока нет</p>}
      <div className="space-y-2">
        {sites?.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}
      </div>
    </section>
  );
}
