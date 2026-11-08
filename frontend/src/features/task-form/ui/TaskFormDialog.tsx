import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  useCreateTask,
  useListExecutors,
  useRefreshData,
  useUpdateTask,
  type Task,
} from '@/shared/api';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { taskSchema, type TaskFormValues } from '../model/task-schema';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Для создания — объект, в котором появится задача. */
  siteId: string;
  /** Если передан — редактирование, иначе создание. */
  task?: Task;
}

function TaskForm({ siteId, task, onDone }: { siteId: string; task?: Task; onDone: () => void }) {
  const refresh = useRefreshData();
  const executors = useListExecutors();
  const create = useCreateTask();
  const update = useUpdateTask();
  const mutation = task ? update : create;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      assigneeId: task?.assignee.id ?? '',
    },
  });

  const submit = (values: TaskFormValues) => {
    const options = {
      onSuccess: async () => {
        await refresh();
        onDone();
      },
    };
    if (task) update.mutate({ id: task.id, data: values }, options);
    else create.mutate({ data: { siteId, ...values } }, options);
  };

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(submit)}>
      <Field label="Название" htmlFor="task-title" error={errors.title?.message}>
        <Input id="task-title" {...register('title')} />
      </Field>
      <Field label="Описание" htmlFor="task-description" error={errors.description?.message}>
        <Textarea id="task-description" {...register('description')} />
      </Field>
      <Field label="Исполнитель" htmlFor="task-assignee" error={errors.assigneeId?.message}>
        <Select id="task-assignee" {...register('assigneeId')}>
          <option value="">Выберите исполнителя</option>
          {executors.data?.map((executor) => (
            <option key={executor.id} value={executor.id}>
              {executor.fullName}
            </option>
          ))}
        </Select>
      </Field>
      {mutation.error && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

export function TaskFormDialog({ open, onOpenChange, siteId, task }: TaskFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? 'Изменить задачу' : 'Новая задача'}
    >
      {open && <TaskForm siteId={siteId} task={task} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}
