import { writeFile } from 'node:fs/promises';
import { buildApp } from '../app';

/** Генерирует `backend/openapi.json` — контракт, из которого фронтенд получает клиент (Orval). Секреты не нужны. */
const app = await buildApp({
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'openapi-generation-only',
  PORT: 0,
  FRONTEND_ORIGIN: 'http://localhost:5173',
});
await app.ready();

const target = new URL('../../openapi.json', import.meta.url);
await writeFile(target, `${JSON.stringify(app.swagger(), null, 2)}\n`);
await app.close();
console.log('Сгенерирован backend/openapi.json');
