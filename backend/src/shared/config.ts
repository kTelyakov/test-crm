import { z } from 'zod';

const configSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  PORT: z.coerce.number().int().default(3000),
  /** Адреса фронтенда через запятую, которым разрешены запросы (CORS). */
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Config = z.infer<typeof configSchema>;

/** Читает конфигурацию из окружения; при ошибке падает сразу с понятным сообщением. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Неверная конфигурация окружения: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
