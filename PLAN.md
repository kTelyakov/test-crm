# План: мини-CRM «Объекты и задачи»

> **Устарел.** Это первый черновик, написанный по обрезанному ТЗ (вариант с `service_role` и проверками в бэкенде). Актуальный дизайн: `openspec/changes/mini-crm-mvp/design.md` (правила переходов в таблице БД, RLS, тонкий бэкенд под токеном пользователя).

> Статус: черновик, правим по этапам. Открытые вопросы помечены **[?]**.

## 1. Стек и главная развилка

Задание требует Supabase (создание пользователей, `service_role`, RLS). Это конфликтует с «backend — DDD»: в Supabase отдельного бэкенда нет.

| | A. Supabase + тонкий бэкенд (рекомендую) | B. Только Supabase (RLS + RPC) |
|---|---|---|
| Где доменная логика | Node/TypeScript-сервис (Fastify или NestJS) с DDD-слоями; Supabase — Postgres и Auth | PL/pgSQL-функции и триггеры |
| Безопасность | JWT проверяется на бэкенде, `service_role` только там; RLS — вторая линия защиты | Всё на RLS и `SECURITY DEFINER` RPC |
| Деплой | Фронт на Vercel, бэкенд на Vercel Functions или Railway/Render | Только Vercel |
| Объём | Больше, в 2–3 часа впритык | Меньше |
| DDD | Реальный | Номинальный |

**[?]** Выбор варианта. План ниже написан под A.

**Общий стек:** React + Vite + TypeScript, TanStack Query, React Router, Supabase Auth на фронте (только `anon`-ключ), Zod, Vitest.

## 2. Модель данных (миграции в `supabase/migrations`)

- `profiles(id → auth.users, full_name, role: 'manager' | 'executor')`
- `sites(id, name, address, description, created_by, created_at)`
- `tasks(id, site_id, title, description, status, assignee_id, created_by, due_date, created_at, updated_at)`
- `task_status_history(id, task_id, from_status, to_status, changed_by, comment, created_at)`

Ограничения и безопасность на уровне БД:

- Enum `task_status`: `new`, `in_progress`, `review`, `done`, `rework`.
- Enum `user_role`; роль в `profiles` недоступна для изменения клиентом.
- История append-only: триггер запрещает `UPDATE`/`DELETE`, прав на запись у клиентских ролей нет.
- Прямой `UPDATE tasks.status` через клиентский API закрыт; статус меняется только через use case (A) или RPC (B).
- RLS включён на всех таблицах: постановщик видит всё; исполнитель — свои задачи и объекты, где у него есть задачи; запись в `sites` и `tasks` только у постановщика.
- Открытая регистрация отключена. Пользователи создаются сид-скриптом на `service_role` (локально, не в репозитории) + `seed.sql` с объектами и задачами в разных статусах.

## 3. Backend (DDD)

```
backend/src/
  modules/
    tasks/
      domain/           Task (агрегат), TaskStatus, StatusTransition, TaskHistoryEntry, ошибки
      application/      TakeToWork, SendToReview, Accept, ReturnToRework,
                        CreateTask, UpdateTask, DeleteTask, GetTaskCard, ListMyTasks
      infrastructure/   SupabaseTaskRepository, мапперы
      presentation/     HTTP-контроллеры + Zod DTO
    sites/              (аналогично)
    identity/           User, Role, проверка JWT, middleware
  shared/               Result/DomainError, Clock, конфиг
```

Ядро — `Task.transition(action, actor, comment?)`: проверяет роль, исполнителя и обязательность комментария, возвращает новый статус и запись истории. Репозиторий сохраняет задачу и историю в одной транзакции. Домен не знает про Supabase и HTTP.

**Таблица переходов (восстановлена, [?] подтвердить):**

| Из | В | Кто | Комментарий |
|---|---|---|---|
| Новая | В работе | назначенный исполнитель | нет |
| В работе | На проверке | назначенный исполнитель | нет |
| На проверке | Принята | постановщик | нет |
| На проверке | На доработке | постановщик | **обязателен** |
| На доработке | В работе | назначенный исполнитель | нет |

Остальные переходы запрещены. Тесты покрывают каждый разрешённый и запрещённый переход.

## 4. Frontend (FSD)

```
src/
  app/        провайдеры, роутер, guards
  pages/      login, sites-list, site-details, task-details, my-tasks
  widgets/    task-list, task-history, site-header
  features/   auth-login, task-create-edit, task-assign,
              task-change-status (кнопки действий + модалка комментария), task-delete
  entities/   user (+ роль), site, task (модель, статус-бейдж, api, правила действий), task-history
  shared/     api-клиент, ui-kit, lib, config
```

- Доступные действия считает чистая функция `getAvailableActions(task, user)` в `entities/task`; UI рисует только её результат. Те же правила проверяются на бэкенде и в БД (UI → домен → RLS).
- Импорты только вниз по слоям; контроль линтером (`eslint-plugin-boundaries` или Steiger).
- Экраны: вход, список объектов, карточка объекта с задачами, карточка задачи (данные, кнопки, история), «Мои задачи».

## 5. Порядок работы (~3 часа)

1. Каркас и БД, 30 мин — репозиторий, Supabase-проект, миграции, RLS, сид.
2. Домен задач с тестами, 30 мин — агрегат, переходы, Vitest.
3. Бэкенд, 40 мин — use cases, репозитории, контроллеры, JWT.
4. Фронтенд, 60 мин — логин, списки, карточки, кнопки, история.
5. Деплой, 20 мин — Vercel, переменные окружения, проверка тремя пользователями.
6. README, 10 мин — запуск, миграции, архитектура, тестовые доступы.

## 6. Что сдаём

Ссылка на приложение, доступы (1 постановщик + 2 исполнителя), репозиторий с миграциями, README. Секретов в репозитории нет: `.env.example`, `service_role` только в переменных окружения бэкенда.

## Открытые вопросы

1. **[?]** Вариант A или B?
2. **[?]** Подтверждение таблицы переходов; полный текст пунктов 2.3 и 3 задания.
3. **[?]** Смена исполнителя: в любом статусе или только до взятия в работу?
4. **[?]** Где хостим бэкенд: Vercel Functions или отдельный сервис?
5. **[?]** Дедлайн и фильтры в списках — нужны или минимум?
