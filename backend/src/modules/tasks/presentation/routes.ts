import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../../../shared/error-schema';
import { siteIdParamsSchema } from '../../sites/presentation/dto';
import { ChangeTaskStatus } from '../application/change-task-status';
import { TaskCardAssembler } from '../application/task-card';
import {
  CreateTask,
  DeleteTask,
  GetTask,
  ListMyTasks,
  ListSiteTasks,
  UpdateTask,
} from '../application/use-cases';
import { SupabaseTaskRepository } from '../infrastructure/supabase-task-repository';
import { SupabaseTransitionRuleRepository } from '../infrastructure/supabase-transition-rule-repository';
import {
  changeStatusBodySchema,
  createTaskBodySchema,
  taskCardSchema,
  taskIdParamsSchema,
  taskSchema,
  updateTaskBodySchema,
} from './dto';
import { toTaskCardDto, toTaskDto } from './mappers';

const secured = { tags: ['tasks'], security: [{ bearerAuth: [] }] };
const errors = { 400: errorResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema };
const notFound = { 404: errorResponseSchema };

/** Собирает зависимости на один запрос: репозитории работают с клиентом БД от имени пользователя. */
function dependencies(request: FastifyRequest) {
  const tasks = new SupabaseTaskRepository(request.session.db);
  const rules = new SupabaseTransitionRuleRepository(request.session.db);
  return { tasks, cards: new TaskCardAssembler(tasks, rules), user: request.session.user };
}

export async function tasksRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    '/sites/:id/tasks',
    {
      schema: {
        ...secured,
        operationId: 'listSiteTasks',
        summary: 'Задачи объекта (исполнитель видит только свои)',
        params: siteIdParamsSchema,
        response: { 200: z.array(taskSchema), ...errors },
      },
    },
    async (request) => {
      const { tasks } = dependencies(request);
      return (await new ListSiteTasks(tasks).execute(request.params.id)).map(toTaskDto);
    },
  );

  api.get(
    '/tasks/my',
    {
      schema: {
        ...secured,
        operationId: 'listMyTasks',
        summary: 'Мои задачи — назначенные текущему пользователю, по всем объектам',
        response: { 200: z.array(taskSchema), ...errors },
      },
    },
    async (request) => {
      const { tasks, user } = dependencies(request);
      return (await new ListMyTasks(tasks).execute(user)).map(toTaskDto);
    },
  );

  api.get(
    '/tasks/:id',
    {
      schema: {
        ...secured,
        operationId: 'getTask',
        summary: 'Карточка задачи: данные, доступные действия и история',
        params: taskIdParamsSchema,
        response: { 200: taskCardSchema, ...notFound, ...errors },
      },
    },
    async (request) => {
      const { cards, user } = dependencies(request);
      return toTaskCardDto(await new GetTask(cards).execute(request.params.id, user));
    },
  );

  api.post(
    '/tasks',
    {
      schema: {
        ...secured,
        operationId: 'createTask',
        summary: 'Создать задачу со статусом «Новая» (постановщик)',
        body: createTaskBodySchema,
        response: { 201: taskCardSchema, 422: errorResponseSchema, ...notFound, ...errors },
      },
    },
    async (request, reply) => {
      const { tasks, cards, user } = dependencies(request);
      const card = await new CreateTask(tasks, cards).execute(request.body, user);
      return reply.status(201).send(toTaskCardDto(card));
    },
  );

  api.patch(
    '/tasks/:id',
    {
      schema: {
        ...secured,
        operationId: 'updateTask',
        summary: 'Изменить название, описание или исполнителя (постановщик)',
        params: taskIdParamsSchema,
        body: updateTaskBodySchema,
        response: {
          200: taskCardSchema,
          409: errorResponseSchema,
          422: errorResponseSchema,
          ...notFound,
          ...errors,
        },
      },
    },
    async (request) => {
      const { tasks, cards, user } = dependencies(request);
      const card = await new UpdateTask(tasks, cards).execute(
        request.params.id,
        request.body,
        user,
      );
      return toTaskCardDto(card);
    },
  );

  api.delete(
    '/tasks/:id',
    {
      schema: {
        ...secured,
        operationId: 'deleteTask',
        summary: 'Удалить задачу вместе с историей (постановщик)',
        params: taskIdParamsSchema,
        response: { 204: z.null(), ...notFound, ...errors },
      },
    },
    async (request, reply) => {
      const { tasks } = dependencies(request);
      await new DeleteTask(tasks).execute(request.params.id);
      return reply.status(204).send(null);
    },
  );

  api.post(
    '/tasks/:id/status',
    {
      schema: {
        ...secured,
        operationId: 'changeTaskStatus',
        summary: 'Сменить статус задачи (правила проверяет база данных)',
        params: taskIdParamsSchema,
        body: changeStatusBodySchema,
        response: {
          200: taskCardSchema,
          409: errorResponseSchema,
          422: errorResponseSchema,
          ...notFound,
          ...errors,
        },
      },
    },
    async (request) => {
      const { tasks, cards, user } = dependencies(request);
      const card = await new ChangeTaskStatus(tasks, cards).execute(
        { taskId: request.params.id, ...request.body },
        user,
      );
      return toTaskCardDto(card);
    },
  );
}
