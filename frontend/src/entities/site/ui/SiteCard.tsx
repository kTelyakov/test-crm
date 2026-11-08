import { Link } from 'react-router-dom';
import type { Site } from '@/shared/api';
import { Card } from '@/shared/ui';

/** Карточка объекта в списке: название и адрес, ведёт на страницу объекта. */
export function SiteCard({ site }: { site: Site }) {
  return (
    <Link to={`/sites/${site.id}`} className="block">
      <Card className="transition-colors hover:border-blue-400">
        <h2 className="font-medium">{site.name}</h2>
        <p className="text-sm text-slate-600">{site.address}</p>
      </Card>
    </Link>
  );
}
