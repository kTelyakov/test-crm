import type { SupabaseClient } from '@supabase/supabase-js';
import { toDomainError } from '../../../shared/db-errors';
import { DomainError } from '../../../shared/domain-error';
import type { SiteInput, SiteRepository } from '../application/ports';
import type { Site } from '../domain/site';

interface SiteRow {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

const COLUMNS = 'id, name, address, created_at';
/** Нарушение внешнего ключа: у объекта есть задачи (`on delete restrict`). */
const FOREIGN_KEY_VIOLATION = '23503';

const toSite = (row: SiteRow): Site => ({
  id: row.id,
  name: row.name,
  address: row.address,
  createdAt: row.created_at,
});

export class SupabaseSiteRepository implements SiteRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<Site[]> {
    const { data, error } = await this.db.from('sites').select(COLUMNS).order('created_at');
    if (error) throw toDomainError(error);
    return (data as SiteRow[]).map(toSite);
  }

  async findById(id: string): Promise<Site | null> {
    const { data, error } = await this.db.from('sites').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw toDomainError(error);
    return data ? toSite(data as SiteRow) : null;
  }

  async create(input: SiteInput): Promise<Site> {
    const { data, error } = await this.db.from('sites').insert(input).select(COLUMNS).single();
    if (error) throw toDomainError(error);
    return toSite(data as SiteRow);
  }

  async update(id: string, changes: Partial<SiteInput>): Promise<Site | null> {
    const { data, error } = await this.db
      .from('sites')
      .update(changes)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw toDomainError(error);
    return data ? toSite(data as SiteRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('sites').delete().eq('id', id).select('id');
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      throw new DomainError('site_has_tasks', 'У объекта есть задачи: сначала удалите их');
    }
    if (error) throw toDomainError(error);
    return data.length > 0;
  }
}
