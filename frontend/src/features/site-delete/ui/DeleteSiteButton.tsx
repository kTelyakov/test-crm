import { useState } from 'react';
import { useDeleteSite, useRefreshData, type Site } from '@/shared/api';
import { Button, Dialog } from '@/shared/ui';

export function DeleteSiteButton({ site, onDeleted }: { site: Site; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const refresh = useRefreshData();
  const remove = useDeleteSite();

  const confirm = () =>
    remove.mutate(
      { id: site.id },
      {
        onSuccess: async () => {
          setOpen(false);
          onDeleted();
          await refresh();
        },
      },
    );

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Удалить
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Удалить объект?"
        description={`Объект «${site.name}» будет удалён. Объект с задачами удалить нельзя.`}
      >
        {remove.error && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {remove.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button variant="danger" disabled={remove.isPending} onClick={confirm}>
            Удалить объект
          </Button>
        </div>
      </Dialog>
    </>
  );
}
