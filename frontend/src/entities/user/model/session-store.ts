import { create } from 'zustand';

export type Role = 'manager' | 'executor';

export interface SessionUser {
  id: string;
  fullName: string;
  role: Role;
}

/** `loading` — пока проверяем, есть ли сохранённая сессия; нужен, чтобы не мигать экраном входа. */
type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  clear: () => void;
}

/** Единственное клиентское состояние приложения — сессия. Данные с сервера живут в TanStack Query. */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  user: null,
  setUser: (user) => set({ status: 'authenticated', user }),
  clear: () => set({ status: 'anonymous', user: null }),
}));
