import { z } from 'zod';

export const commentSchema = z.object({
  comment: z.string().trim().min(1, 'Укажите комментарий'),
});

export type CommentValues = z.infer<typeof commentSchema>;
