import { getMe } from '@/shared/api';
import { useSessionStore } from './session-store';

/** Запрашивает у бэкенда текущего пользователя и роль и кладёт их в стор сессии. */
export async function loadCurrentUser() {
  const user = await getMe();
  useSessionStore.getState().setUser(user);
  return user;
}
