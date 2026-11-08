import { DomainError } from '../../../shared/domain-error';
import type { Site } from '../domain/site';
import type { SiteInput, SiteRepository } from './ports';

const notFound = () => new DomainError('not_found', 'Объект не найден');

export class ListSites {
  constructor(private readonly sites: SiteRepository) {}
  execute(): Promise<Site[]> {
    return this.sites.list();
  }
}

export class GetSite {
  constructor(private readonly sites: SiteRepository) {}
  async execute(id: string): Promise<Site> {
    const site = await this.sites.findById(id);
    if (!site) throw notFound();
    return site;
  }
}

export class CreateSite {
  constructor(private readonly sites: SiteRepository) {}
  execute(input: SiteInput): Promise<Site> {
    return this.sites.create(input);
  }
}

export class UpdateSite {
  constructor(private readonly sites: SiteRepository) {}
  async execute(id: string, changes: Partial<SiteInput>): Promise<Site> {
    const site = await this.sites.update(id, changes);
    if (!site) throw notFound();
    return site;
  }
}

export class DeleteSite {
  constructor(private readonly sites: SiteRepository) {}
  async execute(id: string): Promise<void> {
    if (!(await this.sites.delete(id))) throw notFound();
  }
}
