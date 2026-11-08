import type { SupabaseClient } from '@supabase/supabase-js';
import { toDomainError } from '../../../shared/db-errors';
import type { UserRepository } from '../application/ports';
import type { Role, User } from '../domain/user';

interface ProfileRow {
  id: string;
  full_name: string;
  role: Role;
}

const toUser = (row: ProfileRow): User => ({ id: row.id, fullName: row.full_name, role: row.role });

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', id)
      .maybeSingle();
    if (error) throw toDomainError(error);
    return data ? toUser(data as ProfileRow) : null;
  }

  async listExecutors(): Promise<User[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'executor')
      .order('full_name');
    if (error) throw toDomainError(error);
    return (data as ProfileRow[]).map(toUser);
  }
}
