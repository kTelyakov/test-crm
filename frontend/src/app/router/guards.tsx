import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore, type Role } from '@/entities/user';

/** Пока проверяется сохранённая сессия, ничего не показываем — иначе мигал бы экран входа. */
const Loading = () => <p className="p-6 text-slate-500">Загрузка…</p>;

/** Неавторизованного пользователя отправляет на экран входа. */
export function RequireAuth() {
  const status = useSessionStore((state) => state.status);
  if (status === 'loading') return <Loading />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Пускает на экран только указанные роли. Это удобство интерфейса — настоящую защиту обеспечивает база. */
export function RequireRole({ role }: { role: Role }) {
  const user = useSessionStore((state) => state.user);
  if (user?.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Страница входа не нужна уже вошедшему пользователю. */
export function RedirectIfAuthenticated() {
  const status = useSessionStore((state) => state.status);
  if (status === 'loading') return <Loading />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
