import type { User } from '../domain/user';

/** Проверяет токен и возвращает id пользователя, либо `null`, если токен недействителен. */
export interface TokenVerifier {
  verify(token: string): Promise<string | null>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  listExecutors(): Promise<User[]>;
}
