import { useEffect } from 'react';
import { supabase } from '@/shared/api';
import { loadCurrentUser } from './load-current-user';
import { useSessionStore } from './session-store';

/** При старте восстанавливает сохранённую сессию Supabase и следит за выходом из системы. */
export function useSessionBootstrap() {
  useEffect(() => {
    const { clear } = useSessionStore.getState();

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return clear();
      try {
        await loadCurrentUser();
      } catch {
        clear();
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clear();
    });
    return () => subscription.subscription.unsubscribe();
  }, []);
}
