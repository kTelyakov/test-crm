import { useState } from 'react';
import { useDeleteTask, useRefreshData, type Task } from '@/shared/api';
import { Button, Dialog } from '@/shared/ui';

export function DeleteTaskButton({ task, onDeleted }: { task: Task; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const refresh = useRefreshData();
  const remove = useDeleteTask();

  const confirm = () =>
    remove.mutate(
      { id: task.id },
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
        title="Удалить задачу?"
        description={`Задача «${task.title}» будет удалена вместе с историей статусов.`}
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
            Удалить задачу
          </Button>
        </div>
      </Dialog>
    </>
  );
}
