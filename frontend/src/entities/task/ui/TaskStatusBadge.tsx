import type { TaskStatus } from '@/shared/api';
import { Badge } from '@/shared/ui';
import { STATUS_LABEL, STATUS_TONE } from '../model/status';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
