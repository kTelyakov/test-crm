-- Схема данных: профили, объекты, задачи и история статусов.
-- Права доступа (RLS-политики) добавляются отдельными миграциями.

create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new',          -- Новая
  'in_progress',  -- В работе
  'review',       -- На проверке
  'done',         -- Принята
  'rework'        -- На доработке
);

-- Профиль пользователя: роль хранится здесь, а не в данных, которые может менять клиент.
create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  role      public.user_role not null
);

-- Объект (стройка).
create table public.sites (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  address    text not null check (length(btrim(address)) > 0),
  created_at timestamptz not null default now()
);

-- Задача по объекту. Автор и дата создания проставляются базой, клиент их не задаёт.
-- Объект с задачами удалить нельзя (on delete restrict).
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete restrict,
  title       text not null check (length(btrim(title)) > 0),
  description text not null default '',
  status      public.task_status not null default 'new',
  assignee_id uuid not null references public.profiles (id),
  created_by  uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now()
);

create index tasks_site_id_idx on public.tasks (site_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- История смен статуса. Записи создаются только функцией перехода (см. дальнейшие миграции).
-- История удаляется каскадом только вместе с задачей.
create table public.task_status_history (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status not null,
  to_status   public.task_status not null,
  changed_by  uuid not null references public.profiles (id),
  comment     text,
  created_at  timestamptz not null default now()
);

create index task_status_history_task_id_idx on public.task_status_history (task_id, created_at);

-- Безопасность по умолчанию: RLS включён сразу, пока нет политик, доступа нет ни у кого.
alter table public.profiles            enable row level security;
alter table public.sites               enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_status_history enable row level security;
