-- Права доступа на уровне базы. Действуют при любом обращении: через бэкенд, через интерфейс
-- и при прямых запросах к Supabase API с токеном пользователя.

-- ---------------------------------------------------------------------------------------------
-- Хелперы для политик.
-- SECURITY DEFINER нужен, чтобы политика одной таблицы могла читать другую без рекурсии политик.
-- search_path зафиксирован пустым, чтобы функцию нельзя было подменить объектами другой схемы.
-- ---------------------------------------------------------------------------------------------

create function public.is_manager()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'manager'
  );
$$;

-- Назначена ли текущему пользователю хотя бы одна задача на этом объекте.
create function public.has_task_on_site(p_site_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tasks where site_id = p_site_id and assignee_id = auth.uid()
  );
$$;

-- Назначена ли текущему пользователю эта задача.
create function public.is_task_assignee(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tasks where id = p_task_id and assignee_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- Права на таблицы. Сначала отзываем всё (Supabase выдаёт широкие права по умолчанию),
-- затем выдаём только нужное. Роль anon (без входа) не получает ничего.
-- ---------------------------------------------------------------------------------------------

revoke all on public.profiles, public.sites, public.tasks,
              public.task_status_history, public.task_transitions
  from anon, authenticated;

grant select on public.profiles, public.task_transitions, public.task_status_history
  to authenticated;

grant select, insert, update, delete on public.sites to authenticated;

-- Права на столбцы задач: клиент не может задать статус, автора и дату создания при создании
-- и не может менять статус обычным UPDATE. Статус меняет только функция перехода.
grant select, delete on public.tasks to authenticated;
grant insert (site_id, title, description, assignee_id) on public.tasks to authenticated;
grant update (title, description, assignee_id) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Политики строк (RLS).
-- ---------------------------------------------------------------------------------------------

-- Профили: имена и роли видны всем вошедшим (нужны для отображения), изменять нельзя никому.
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

-- Правила переходов: читать могут все вошедшие, изменять нельзя.
create policy task_transitions_select on public.task_transitions
  for select to authenticated
  using (true);

-- Объекты: постановщик видит все, исполнитель только те, где у него есть задачи.
create policy sites_select on public.sites
  for select to authenticated
  using (public.is_manager() or public.has_task_on_site(id));

create policy sites_insert on public.sites
  for insert to authenticated
  with check (public.is_manager());

create policy sites_update on public.sites
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy sites_delete on public.sites
  for delete to authenticated
  using (public.is_manager());

-- Задачи: постановщик видит все, исполнитель только назначенные ему; менять может только постановщик.
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_manager() or assignee_id = auth.uid());

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_manager());

create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_manager());

-- История: видна тем, кто видит задачу. Записи вносит только функция перехода (она добавится позже).
create policy task_status_history_select on public.task_status_history
  for select to authenticated
  using (public.is_manager() or public.is_task_assignee(task_id));
