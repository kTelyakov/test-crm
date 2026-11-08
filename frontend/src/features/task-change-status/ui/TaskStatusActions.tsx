import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ACTION_LABEL } from '@/entities/task';
import { useChangeTaskStatus, useRefreshData, type TaskAction, type TaskCard } from '@/shared/api';
import { Button, Dialog, Field, Textarea } from '@/shared/ui';
import { commentSchema, type CommentValues } from '../model/comment-schema';

/**
 * Кнопки смены статуса. Какие из них показать, решает бэкенд (`availableActions`),
 * а допустимость перехода в итоге проверяет база данных.
 */
export function TaskStatusActions({ task }: { task: TaskCard }) {
  const refresh = useRefreshData();
  const change = useChangeTaskStatus();
  const [commentFor, setCommentFor] = useState<TaskAction | null>(null);

  const apply = (action: TaskAction, comment?: string) =>
    change.mutate(
      { id: task.id, data: { toStatus: action.toStatus, comment } },
      {
        onSuccess: async () => {
          setCommentFor(null);
          await refresh();
        },
      },
    );

  if (task.availableActions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {task.availableActions.map((action) => (
          <Button
            key={action.toStatus}
            variant={action.requiresComment ? 'secondary' : 'primary'}
            disabled={change.isPending}
            onClick={() => (action.requiresComment ? setCommentFor(action) : apply(action))}
          >
            {ACTION_LABEL[action.toStatus]}
          </Button>
        ))}
      </div>
      {change.error && !commentFor && (
        <p role="alert" className="text-sm text-red-600">
          {change.error.message}
        </p>
      )}
      <Dialog
        open={commentFor !== null}
        onOpenChange={(open) => !open && setCommentFor(null)}
        title={commentFor ? ACTION_LABEL[commentFor.toStatus] : ''}
        description="Для этого действия нужен комментарий — исполнитель увидит его в истории."
      >
        {commentFor && (
          <CommentForm
            error={change.error?.message}
            pending={change.isPending}
            onCancel={() => setCommentFor(null)}
            onSubmit={(comment) => apply(commentFor, comment)}
          />
        )}
      </Dialog>
    </div>
  );
}

function CommentForm(props: {
  error?: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (comment: string) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommentValues>({ resolver: zodResolver(commentSchema) });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((v) => props.onSubmit(v.comment))}
    >
      <Field label="Комментарий" htmlFor="status-comment" error={errors.comment?.message}>
        <Textarea id="status-comment" {...register('comment')} />
      </Field>
      {props.error && (
        <p role="alert" className="text-sm text-red-600">
          {props.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={props.onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={props.pending}>
          Подтвердить
        </Button>
      </div>
    </form>
  );
}
