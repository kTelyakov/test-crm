import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { DomainError, type DomainErrorCode } from './domain-error';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  transition_forbidden: 403,
  not_found: 404,
  transition_not_allowed: 409,
  assignee_change_not_allowed: 409,
  site_has_tasks: 409,
  comment_required: 422,
  assignee_must_be_executor: 422,
};

/** Единый формат ошибок API: `{ code, message }`. */
export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof DomainError) {
    return reply
      .status(STATUS_BY_CODE[error.code])
      .send({ code: error.code, message: error.message });
  }
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply
      .status(400)
      .send({ code: 'validation_failed', message: 'Некорректные данные запроса' });
  }
  request.log.error(error);
  return reply.status(500).send({ code: 'internal_error', message: 'Внутренняя ошибка сервера' });
}
