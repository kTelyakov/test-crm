import type { Site } from '../domain/site';

export interface SiteInput {
  name: string;
  address: string;
}

export interface SiteRepository {
  /** Возвращает только те объекты, которые пользователю разрешено видеть (решает RLS). */
  list(): Promise<Site[]>;
  findById(id: string): Promise<Site | null>;
  create(input: SiteInput): Promise<Site>;
  /** `null`, если объекта нет или он недоступен пользователю. */
  update(id: string, changes: Partial<SiteInput>): Promise<Site | null>;
  /** `false`, если объекта нет или он недоступен пользователю. */
  delete(id: string): Promise<boolean>;
}
