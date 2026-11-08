import { env } from '@/shared/config';
import { supabase } from './supabase';

/** Параметры запроса, которые подставляет сгенерированный клиент (Orval). */
interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Ошибка API в формате бэкенда `{ code, message }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Единственная точка, через которую фронтенд обращается к бэкенду: подставляет токен пользователя
 * и превращает ответы с ошибкой в `ApiError`.
 */
export async function apiClient<T>(config: RequestConfig): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(config.params ?? {})) {
    if (value !== undefined) query.set(key, String(value));
  }
  const url = `${env.apiUrl}${config.url}${query.size ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: config.method,
    headers: {
      ...config.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.data === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: config.data === undefined ? undefined : JSON.stringify(config.data),
    signal: config.signal,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.code ?? 'unknown_error',
      body?.message ?? 'Не удалось выполнить запрос',
    );
  }
  return body as T;
}

/** Тип ошибки для хуков: `useQuery<Data, ErrorType<unknown>>`. */
export type ErrorType<E> = ApiError & { body?: E };
