function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name} (см. .env.example)`);
  return value;
}

/** Только для подготовки тестовых данных (например, задача в нужном статусе). Приложение его не использует. */
export const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

export const env = {
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  testUserPassword: requireEnv('TEST_USER_PASSWORD'),
  backendUrl: process.env['BACKEND_URL'] ?? 'http://localhost:3100',
};
