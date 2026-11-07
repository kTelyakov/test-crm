// Демонстрационные данные: объекты и задачи в разных статусах.
// Данные создаются от имени реальных пользователей через обычные правила доступа и функцию
// смены статуса, поэтому история статусов настоящая. Ключ service_role здесь не нужен.
// Запуск: pnpm db:seed:demo (пользователи должны быть созданы: pnpm db:seed:users).
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USER_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_USER_PASSWORD) {
  throw new Error('Нужны SUPABASE_URL, SUPABASE_ANON_KEY и TEST_USER_PASSWORD (см. .env.example)');
}

async function signIn(email) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: TEST_USER_PASSWORD,
  });
  if (error) throw new Error(`Не удалось войти как ${email}: ${error.message}`);
  return { client, id: data.user.id };
}

const manager = await signIn('manager@test.local');
const executor1 = await signIn('executor1@test.local');
const executor2 = await signIn('executor2@test.local');
const executors = { e1: executor1, e2: executor2 };

const { count } = await manager.client.from('sites').select('id', { count: 'exact', head: true });
if (count > 0) {
  console.log('В базе уже есть объекты, демо-данные не добавляются.');
  process.exit(0);
}

async function createSite(name, address) {
  const { data, error } = await manager.client
    .from('sites')
    .insert({ name, address })
    .select('id')
    .single();
  if (error) throw new Error(`Объект «${name}»: ${error.message}`);
  return data.id;
}

// Путь к статусу: каждый шаг выполняет тот, кому он разрешён правилами.
const PATHS = {
  new: [],
  in_progress: [['e', 'in_progress']],
  review: [
    ['e', 'in_progress'],
    ['e', 'review'],
  ],
  done: [
    ['e', 'in_progress'],
    ['e', 'review'],
    ['m', 'done'],
  ],
  rework: [
    ['e', 'in_progress'],
    ['e', 'review'],
    ['m', 'rework', 'Не соответствует чертежу, доработать'],
  ],
};

async function createTask({ siteId, title, description, executor, status }) {
  const assignee = executors[executor];
  const { data, error } = await manager.client
    .from('tasks')
    .insert({ site_id: siteId, title, description, assignee_id: assignee.id })
    .select('id')
    .single();
  if (error) throw new Error(`Задача «${title}»: ${error.message}`);

  for (const [actor, toStatus, comment] of PATHS[status]) {
    const client = actor === 'm' ? manager.client : assignee.client;
    const { error: stepError } = await client.rpc('change_task_status', {
      p_task_id: data.id,
      p_to_status: toStatus,
      p_comment: comment ?? null,
    });
    if (stepError) throw new Error(`«${title}» → ${toStatus}: ${stepError.message}`);
  }
}

const north = await createSite('ЖК «Северный»', 'ул. Лесная, 12');
const warehouse = await createSite('Склад на Промышленной', 'Промышленная ул., 5');
const office = await createSite('Офисный центр «Горизонт»', 'пр. Мира, 40');

const tasks = [
  {
    siteId: north,
    title: 'Залить фундамент секции А',
    description: 'Бетон B25, контроль температуры.',
    executor: 'e1',
    status: 'done',
  },
  {
    siteId: north,
    title: 'Армирование перекрытий',
    description: 'Шаг арматуры по чертежу КР-3.',
    executor: 'e1',
    status: 'rework',
  },
  {
    siteId: north,
    title: 'Монтаж опалубки секции Б',
    description: 'Подготовить к заливке на следующей неделе.',
    executor: 'e2',
    status: 'in_progress',
  },
  {
    siteId: warehouse,
    title: 'Заменить кровельное покрытие',
    description: 'Демонтаж старого и укладка нового покрытия.',
    executor: 'e2',
    status: 'review',
  },
  {
    siteId: warehouse,
    title: 'Проверить электропроводку',
    description: 'Акт проверки по всем помещениям.',
    executor: 'e1',
    status: 'new',
  },
  {
    siteId: warehouse,
    title: 'Установить секционные ворота',
    description: 'Два проёма со стороны двора.',
    executor: 'e2',
    status: 'new',
  },
  {
    siteId: office,
    title: 'Покраска стен второго этажа',
    description: 'Два слоя, цвет по каталогу.',
    executor: 'e1',
    status: 'in_progress',
  },
  {
    siteId: office,
    title: 'Установка межкомнатных дверей',
    description: '12 дверей, фурнитура на складе.',
    executor: 'e1',
    status: 'new',
  },
];

for (const task of tasks) await createTask(task);

console.log(`Создано объектов: 3, задач: ${tasks.length}`);
