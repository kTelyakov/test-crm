-- Правила переходов статусов задачи хранятся как данные.
-- Это единственный источник правил: функция смены статуса в БД проверяет по ним каждый переход,
-- а бэкенд читает те же строки, чтобы показывать пользователю только доступные действия.
-- Любой переход, которого нет в таблице, запрещён.

create table public.task_transitions (
  from_status       public.task_status not null,
  to_status         public.task_status not null,
  actor_role        public.user_role   not null,  -- какая роль может выполнить переход
  requires_assignee boolean            not null,  -- только назначенный исполнитель задачи
  requires_comment  boolean            not null default false,
  primary key (from_status, to_status),
  check (from_status <> to_status)
);

insert into public.task_transitions
  (from_status,   to_status,     actor_role, requires_assignee, requires_comment)
values
  ('new',         'in_progress', 'executor', true,  false),  -- взять в работу
  ('in_progress', 'review',      'executor', true,  false),  -- отправить на проверку
  ('review',      'done',        'manager',  false, false),  -- принять
  ('review',      'rework',      'manager',  false, true),   -- вернуть на доработку (комментарий обязателен)
  ('rework',      'in_progress', 'executor', true,  false);  -- вернуться к работе

-- Безопасность по умолчанию; политика чтения добавляется в миграции RLS.
alter table public.task_transitions enable row level security;
