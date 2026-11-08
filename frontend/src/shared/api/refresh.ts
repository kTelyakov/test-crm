import { useQueryClient } from '@tanstack/react-query';

/**
 * После любого изменения данных обновляем все активные запросы: приложение небольшое,
 * а простое правило надёжнее ручного перечисления ключей (список, карточка, «Мои задачи»).
 */
export function useRefreshData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}
