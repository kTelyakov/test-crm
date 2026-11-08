/** Машинные коды доменных ошибок. Транспорт (HTTP) решает, какой статус им соответствует. */
export type DomainErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'transition_not_allowed'
  | 'transition_forbidden'
  | 'comment_required'
  | 'assignee_must_be_executor'
  | 'assignee_change_not_allowed'
  | 'site_has_tasks';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
