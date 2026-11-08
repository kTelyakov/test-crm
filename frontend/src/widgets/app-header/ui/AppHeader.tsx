import { NavLink } from 'react-router-dom';
import { ROLE_LABEL, useSessionStore } from '@/entities/user';
import { LogoutButton } from '@/features/auth-logout';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold text-blue-700' : 'text-slate-700 hover:text-blue-700';

export function AppHeader() {
  const user = useSessionStore((state) => state.user);
  if (!user) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex items-center gap-4" aria-label="Разделы">
          <NavLink to="/sites" className={navClass}>
            Объекты
          </NavLink>
          {user.role === 'executor' && (
            <NavLink to="/my-tasks" className={navClass}>
              Мои задачи
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {user.fullName}
            <span className="ml-1 text-slate-500 before:mr-1 before:content-['·']">
              {ROLE_LABEL[user.role]}
            </span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
