import { env } from './env';
import { clientFor } from './supabase';
import type { TestUser } from './users';

// Тело ответа в тестах проверяется точечно, поэтому по умолчанию оно не типизировано.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

/** Токен пользователя, как его получает браузер после входа. */
export async function tokenFor(user: TestUser): Promise<string> {
  const client = await clientFor(user);
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error(`Нет сессии для ${user.email}`);
  return data.session.access_token;
}

async function call(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<ApiResponse> {
  const response = await fetch(`${env.backendUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** Клиент API бэкенда от имени пользователя (или без токена, если передан `null`). */
export function apiWithToken(token: string | null) {
  return {
    get: (path: string, headers?: Record<string, string>) =>
      call('GET', path, token, undefined, headers),
    post: (path: string, body?: unknown) => call('POST', path, token, body ?? {}),
    patch: (path: string, body: unknown) => call('PATCH', path, token, body),
    delete: (path: string) => call('DELETE', path, token),
  };
}

export async function apiAs(user: TestUser) {
  return apiWithToken(await tokenFor(user));
}
