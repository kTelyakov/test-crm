import { ROLE_LABEL, useSessionStore } from '@/entities/user';
import { LogoutButton } from '@/features/auth-logout';

export function AppHeader() {
  const user = useSessionStore((state) => state.user);
  if (!user) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <span className="font-semibold">Объекты и задачи</span>
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
