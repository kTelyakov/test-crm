import { useState } from 'react';
import type { Task } from '@/shared/api';
import { Button } from '@/shared/ui';
import { TaskFormDialog } from './TaskFormDialog';

export function CreateTaskButton({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Добавить задачу</Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} siteId={siteId} />
    </>
  );
}

export function EditTaskButton({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Изменить
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} siteId={task.siteId} task={task} />
    </>
  );
}
