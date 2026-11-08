import { DomainError } from '../../../shared/domain-error';
import type { User } from '../domain/user';
import type { TokenVerifier, UserRepository } from './ports';

/** Определяет, кто делает запрос: проверяет токен и загружает профиль с ролью. */
export class ResolveCurrentUser {
  constructor(
    private readonly verifier: TokenVerifier,
    private readonly users: UserRepository,
  ) {}

  async execute(token: string | undefined): Promise<User> {
    if (!token) throw new DomainError('unauthenticated', 'Требуется вход в систему');

    const userId = await this.verifier.verify(token);
    if (!userId) throw new DomainError('unauthenticated', 'Сессия недействительна, войдите заново');

    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('unauthenticated', 'Профиль пользователя не найден');
    return user;
  }
}
