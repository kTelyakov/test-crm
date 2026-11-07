export type TestRole = 'manager' | 'executor';

export interface TestUser {
  email: string;
  role: TestRole;
}

// Пользователи создаются скриптом supabase/seed/users.mjs.
export const manager: TestUser = { email: 'manager@test.local', role: 'manager' };
export const executor1: TestUser = { email: 'executor1@test.local', role: 'executor' };
export const executor2: TestUser = { email: 'executor2@test.local', role: 'executor' };
