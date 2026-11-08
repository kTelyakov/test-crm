import { RouterProvider } from 'react-router-dom';
import { useSessionBootstrap } from '@/entities/user';
import { router } from './router/router';

export function App() {
  useSessionBootstrap();
  return <RouterProvider router={router} />;
}
