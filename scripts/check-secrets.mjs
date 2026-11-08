// Проверка, что секреты не попали в репозиторий и в сборку фронтенда.
// Запуск: pnpm check:secrets (перед этим желательно собрать фронтенд: pnpm --filter @test-crm/frontend build).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Публичный (anon) ключ — тоже JWT и по замыслу попадает в сборку, поэтому JWT проверяем по роли в содержимом.
// Имена переменных (SERVICE_ROLE_KEY=) допустимы, опасны только значения ключей.
const JWT = /eyJ[A-Za-z0-9_-]{5,}\.(eyJ[A-Za-z0-9_-]{5,})\.[A-Za-z0-9_-]{5,}/g;
const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]{10,}/;

function hasSecret(text) {
  if (SECRET_KEY.test(text)) return true;
  for (const [, payload] of text.matchAll(JWT)) {
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (claims.role === 'service_role') return true;
    } catch {
      // Не JWT — пропускаем.
    }
  }
  return false;
}
const problems = [];

const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
for (const file of tracked) {
  if (!existsSync(file) || file.endsWith('pnpm-lock.yaml')) continue;
  const text = readFileSync(file, 'utf8');
  if (hasSecret(text)) {
    problems.push(`Похоже на ключ в файле репозитория: ${file}`);
  }
}
if (tracked.some((file) => /(^|\/)\.env$/.test(file))) problems.push('В git добавлен файл .env');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

if (existsSync('frontend/dist')) {
  for (const file of walk('frontend/dist')) {
    const text = readFileSync(file, 'utf8');
    if (/service_role/i.test(text) || hasSecret(text)) {
      problems.push(`Секрет или service_role в сборке фронтенда: ${file}`);
    }
  }
} else {
  console.warn('frontend/dist не найден: сборка не проверялась');
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Секретов в репозитории и в сборке фронтенда не найдено');
