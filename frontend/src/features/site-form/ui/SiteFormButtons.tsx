import { useState } from 'react';
import type { Site } from '@/shared/api';
import { Button } from '@/shared/ui';
import { SiteFormDialog } from './SiteFormDialog';

export function CreateSiteButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Добавить объект</Button>
      <SiteFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function EditSiteButton({ site }: { site: Site }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Изменить
      </Button>
      <SiteFormDialog open={open} onOpenChange={setOpen} site={site} />
    </>
  );
}
