import { useMutation } from '@tanstack/react-query';
import { loadCurrentUser } from '@/entities/user';
import { supabase } from '@/shared/api';
import type { LoginValues } from './login-schema';

/** Вход: Supabase Auth проверяет пароль, затем бэкенд сообщает роль пользователя. */
export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: LoginValues) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Неверный email или пароль');
      return loadCurrentUser();
    },
  });
}
