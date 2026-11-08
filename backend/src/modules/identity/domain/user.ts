export type Role = 'manager' | 'executor';

/** Пользователь системы. Роль берётся из профиля в БД, а не из данных, которые присылает клиент. */
export interface User {
  id: string;
  fullName: string;
  role: Role;
}
