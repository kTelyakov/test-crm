-- Смена статуса задачи. Единственный способ изменить статус и единственный способ добавить
-- запись в историю. Все проверки делает база по таблице task_transitions.
--
-- Функция выполняется с правами владельца (SECURITY DEFINER), потому что у клиентов нет прямого
-- права менять статус и писать в историю. Пользователь определяется по токену (auth.uid()),
-- а не по параметрам, поэтому подменить его нельзя.
--
-- Коды ошибок (сообщение исключения), по которым их разбирает бэкенд:
--   not_authenticated        нет входа или нет профиля
--   task_not_found           задачи нет или она недоступна пользователю
--   transition_not_allowed   такого перехода нет в таблице правил
--   transition_forbidden     переход есть, но не для этой роли или не для этого исполнителя
--   comment_required         для перехода обязателен комментарий

create function public.change_task_status(
  p_task_id   uuid,
  p_to_status public.task_status,
  p_comment   text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role    public.user_role;
  v_task    public.tasks;
  v_rule    public.task_transitions;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null then
    raise exception 'not_authenticated';
  end if;

  -- Блокируем строку: два одновременных перехода выстроятся в очередь,
  -- второй проверится уже против нового статуса.
  select * into v_task from public.tasks where id = p_task_id for update;

  -- Чужая задача для исполнителя выглядит как несуществующая.
  if not found or (v_role = 'executor' and v_task.assignee_id <> v_user_id) then
    raise exception 'task_not_found';
  end if;

  select * into v_rule
  from public.task_transitions
  where from_status = v_task.status and to_status = p_to_status;

  if not found then
    raise exception 'transition_not_allowed';
  end if;

  if v_rule.actor_role <> v_role
     or (v_rule.requires_assignee and v_task.assignee_id <> v_user_id) then
    raise exception 'transition_forbidden';
  end if;

  if v_rule.requires_comment and v_comment is null then
    raise exception 'comment_required';
  end if;

  update public.tasks set status = p_to_status where id = p_task_id
  returning * into v_task;

  -- Запись истории в той же транзакции: если она не удалась, статус тоже не меняется.
  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, v_rule.from_status, p_to_status, v_user_id, v_comment);

  return v_task;
end;
$$;

-- Вызывать функцию могут только вошедшие пользователи.
revoke all on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Неизменяемая история. У клиентских ролей нет прав на запись в таблицу (см. миграцию RLS);
-- триггер защищает от изменений и тех, у кого права есть (например, владельца таблицы).
-- Каскадное удаление вместе с задачей разрешено: оно выполняется из триггера внешнего ключа
-- (глубина вложенности больше 1), а прямое удаление строки истории запрещено.
-- ---------------------------------------------------------------------------------------------

create function public.forbid_history_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'history_is_immutable';
end;
$$;

create trigger task_status_history_immutable
  before update or delete on public.task_status_history
  for each row execute function public.forbid_history_changes();
