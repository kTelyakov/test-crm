import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { Button } from '@/shared/ui';

export function LogoutButton() {
  const queryClient = useQueryClient();

  const logout = async () => {
    await supabase.auth.signOut();
    // Данные прошлого пользователя не должны попасть в кэш следующего.
    queryClient.clear();
  };

  return (
    <Button variant="secondary" size="sm" onClick={() => void logout()}>
      Выйти
    </Button>
  );
}
