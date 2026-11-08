# Мини-CRM «Объекты и задачи»

Учебная CRM для строительной компании. Постановщик заводит объекты и задачи и принимает работу, исполнитель ведёт задачи по статусам. Правила доступа и переходов статусов защищены на уровне базы данных.

## Демо

- Приложение: https://test-crm-ochre.vercel.app
- Бэкенд: https://mini-crm-backend-qw4c.onrender.com (`/health`; бесплатный план засыпает, первый запрос может занять до минуты)
- Доступы: `manager@test.local` (постановщик), `executor1@test.local` и `executor2@test.local` (исполнители). Пароль передан отдельно (не хранится в репозитории).

Условие задания — `docs/TZ.md`, решения и допущения — `docs/DECISIONS.md`, объяснение для руководителя без технических терминов — `docs/for-manager.md`.

## Что внутри

| Каталог     | Содержимое                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `supabase/` | миграции (схема, RLS, правила переходов, функция смены статуса), сид пользователей и демо-данных |
| `backend/`  | тонкий API на Fastify по DDD (модули `identity`, `sites`, `tasks`)                               |
| `frontend/` | интерфейс на React по FSD                                                                        |
| `e2e/`      | тесты Playwright: UI, API бэкенда и прямые запросы к Supabase                                    |
| `openspec/` | спецификации и план работ (OpenSpec): `openspec/changes/mini-crm-mvp/`                           |

## Архитектура

```
Браузер (React, FSD) ──вход──▶ Supabase Auth
        │ токен пользователя
        ▼
Бэкенд (Fastify, DDD) ──токен пользователя──▶ Supabase Postgres
                                                RLS · task_transitions · change_task_status · триггеры
```

- **Защищает база.** Видимость данных (RLS), допустимые переходы статусов (таблица `task_transitions` и функция `change_task_status`), неизменяемая история и назначение только исполнителей описаны в миграциях и действуют при любом способе обращения, в том числе при прямых запросах к Supabase API.
- **Бэкенд тонкий.** Он ходит в базу **с токеном пользователя**, ключа `service_role` не знает, правила не дублирует, а читает ту же таблицу правил, чтобы отдать интерфейсу список доступных действий (`availableActions`).
- **Контракт генерируется.** Zod-схемы бэкенда → `backend/openapi.json` → клиент и хуки TanStack Query во `frontend/src/shared/api/generated` (Orval). API-запросы вручную не пишутся.
- **Фронтенд — FSD** (`app → pages → widgets → features → entities → shared`), границы слоёв проверяет Steiger. Состояние: данные сервера в TanStack Query, в Zustand только сессия.

## Запуск локально

Нужны Node 22, pnpm (через `corepack enable`) и Docker (для локального Supabase).

```bash
pnpm install
pnpm exec supabase start            # локальный Supabase; выведет URL и ключи
cp .env.example .env                # заполнить из вывода supabase status -o env + TEST_USER_PASSWORD
cp frontend/.env.example frontend/.env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
pnpm db:reset                       # применить миграции
pnpm db:seed                        # пользователи и демо-данные
pnpm dev:backend                    # http://localhost:3000
pnpm dev:frontend                   # http://localhost:5173
```

Тестовые пользователи (пароль — значение `TEST_USER_PASSWORD`): `manager@test.local` (постановщик), `executor1@test.local` и `executor2@test.local` (исполнители).

## Миграции и сид

- Миграции лежат в `supabase/migrations` и применяются по порядку: `pnpm db:reset` (локально) или `supabase db push` (облачный проект после `supabase link`).
- `pnpm db:seed:users` создаёт пользователей. Это единственное место, где нужен ключ `service_role`; он берётся из `.env`, который не попадает в git.
- `pnpm db:seed:demo` создаёт 3 объекта и 8 задач во всех статусах с настоящей историей: задачи двигаются через те же функции базы, что и в приложении.

## Тесты

```bash
pnpm test:unit    # Vitest: расчёт доступных действий
pnpm test:e2e     # Playwright: сброс БД, сид пользователей и 126 сценариев
pnpm check        # линтер, формат, типы, границы FSD, unit-тесты
pnpm check:secrets  # нет ли ключей в репозитории и в сборке фронтенда (после pnpm --filter @test-crm/frontend build)
```

`pnpm test:e2e` сам поднимает бэкенд (порт 3100) и фронтенд (порт 5173). UI-тесты идут в установленном Google Chrome (`playwright install chrome`, если его нет). Тесты названы по сценариям из `openspec/changes/mini-crm-mvp/specs/`.

Сценарии «в обход интерфейса» ходят в Supabase напрямую с токеном пользователя: чужие задачи, прямое изменение статуса, запрещённый переход, подделка истории, регистрация и смена роли.

## Генерация API-клиента

```bash
pnpm api:generate   # обновляет backend/openapi.json и frontend/src/shared/api/generated
```

После изменения маршрутов или схем бэкенда сгенерированные файлы коммитятся; повторная генерация не должна давать diff.

## Развёртывание

1. **База.** Создать проект в Supabase, отключить открытую регистрацию (Authentication → Sign In / Providers → «Allow new users to sign up» выключить), выполнить `supabase link` и `supabase db push`. Пользователей и демо-данные создать `pnpm db:seed` с адресом и ключами облачного проекта в `.env` (ключ `service_role` остаётся только на вашей машине).
2. **Бэкенд** (Render, `render.yaml`): переменные `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FRONTEND_ORIGIN` (адрес фронтенда). Бесплатный план «засыпает» — первый запрос после простоя идёт до минуты, перед показом стоит открыть `/health`.
3. **Фронтенд** (Vercel, корень `frontend`): переменные `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (адрес бэкенда). `vercel.json` настраивает переход на `index.html` для маршрутов SPA.

Во фронтенд и в репозиторий попадают только публичные значения (`anon`-ключ). Ключ `service_role` в сборке и коде приложения отсутствует.

### Проверка деплоя

`pnpm test:deployed` прогоняет smoke-тесты против живого приложения: вход тремя пользователями, закрытая регистрация, CORS, видимость задач, отказ прямой смены статуса. Тесты только читают и отправляют заведомо отклоняемые запросы, демо-данные не меняются. Нужны `FRONTEND_URL` и `BACKEND_URL` в окружении и облачные ключи в `.env`. Основной набор (`test:e2e`) создаёт и удаляет данные, поэтому запускать его с облачным `.env` нельзя.
