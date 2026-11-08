import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/widgets/app-header';

export function AppLayout() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}
