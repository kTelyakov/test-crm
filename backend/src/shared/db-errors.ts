import type { PostgrestError } from '@supabase/supabase-js';
import { DomainError, type DomainErrorCode } from './domain-error';

/** Сообщения, которые функции и триггеры БД передают в `RAISE EXCEPTION`, и соответствующие доменные ошибки. */
const DB_MESSAGES: Record<string, { code: DomainErrorCode; message: string }> = {
  not_authenticated: { code: 'unauthenticated', message: 'Требуется вход в систему' },
  task_not_found: { code: 'not_found', message: 'Задача не найдена' },
  transition_not_allowed: {
    code: 'transition_not_allowed',
    message: 'Такой переход статуса не предусмотрен',
  },
  transition_forbidden: {
    code: 'transition_forbidden',
    message: 'У вас нет прав на этот переход',
  },
  comment_required: { code: 'comment_required', message: 'Для этого перехода нужен комментарий' },
  assignee_must_be_executor: {
    code: 'assignee_must_be_executor',
    message: 'Назначать можно только исполнителя',
  },
  assignee_change_not_allowed: {
    code: 'assignee_change_not_allowed',
    message: 'Менять исполнителя можно только у задачи в статусе «Новая» или «На доработке»',
  },
};

/** Ошибка нарушения RLS или прав на таблицу/столбец. */
const INSUFFICIENT_PRIVILEGE = '42501';

/**
 * Переводит ошибку БД в доменную. Неизвестные ошибки пробрасываются как есть (станут HTTP 500),
 * чтобы не прятать настоящие сбои за «понятным» сообщением.
 */
export function toDomainError(error: PostgrestError): Error {
  const known = DB_MESSAGES[error.message];
  if (known) return new DomainError(known.code, known.message);
  if (error.code === INSUFFICIENT_PRIVILEGE) {
    return new DomainError('forbidden', 'Недостаточно прав для этой операции');
  }
  return new Error(`Ошибка базы данных: ${error.message}`);
}
