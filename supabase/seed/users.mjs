// Создание тестовых пользователей и их профилей (роли).
// Запуск: pnpm db:seed:users. Требует SUPABASE_SERVICE_ROLE_KEY: этот ключ нужен только здесь.
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_USER_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TEST_USER_PASSWORD) {
  throw new Error(
    'Нужны SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY и TEST_USER_PASSWORD (см. .env.example)',
  );
}

export const SEED_USERS = [
  { email: 'manager@test.local', fullName: 'Иван Руководитель', role: 'manager' },
  { email: 'executor1@test.local', fullName: 'Пётр Исполнитель', role: 'executor' },
  { email: 'executor2@test.local', fullName: 'Анна Исполнитель', role: 'executor' },
];

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Находит пользователя по почте, чтобы повторный запуск не падал. */
async function findUserId(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Не удалось получить пользователей: ${error.message}`);
  return data.users.find((u) => u.email === email)?.id;
}

for (const user of SEED_USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });
  const alreadyExists = error?.message.includes('already been registered');
  if (error && !alreadyExists) throw new Error(`Не удалось создать ${user.email}: ${error.message}`);

  const id = alreadyExists ? await findUserId(user.email) : data.user.id;

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id, full_name: user.fullName, role: user.role });
  if (profileError)
    throw new Error(`Не удалось создать профиль ${user.email}: ${profileError.message}`);

  console.log(`Готов ${user.role}: ${user.email}`);
}
