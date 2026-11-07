-- Правила назначения исполнителя. Проверяются в базе, поэтому действуют при любом способе записи.
--  1. Назначить задачу можно только пользователю с ролью «исполнитель».
--  2. Сменить исполнителя можно только пока задача «Новая» или «На доработке».

create function public.enforce_task_assignee_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Проверка нужна при создании и при реальной смене исполнителя.
  if tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id then
    return new;
  end if;

  if not exists (
    select 1 from public.profiles where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'assignee_must_be_executor';
  end if;

  if tg_op = 'UPDATE' and old.status not in ('new', 'rework') then
    raise exception 'assignee_change_not_allowed';
  end if;

  return new;
end;
$$;

create trigger tasks_enforce_assignee_rules
  before insert or update of assignee_id on public.tasks
  for each row execute function public.enforce_task_assignee_rules();
