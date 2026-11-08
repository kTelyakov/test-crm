import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { LoginPage } from '@/pages/login';
import { MyTasksPage } from '@/pages/my-tasks';
import { SiteDetailsPage } from '@/pages/site-details';
import { TaskDetailsPage } from '@/pages/task-details';
import { SitesPage } from '@/pages/sites';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './guards';

export const router = createBrowserRouter([
  { element: <RedirectIfAuthenticated />, children: [{ path: '/login', element: <LoginPage /> }] },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/sites" replace /> },
          { path: '/sites', element: <SitesPage /> },
          { path: '/sites/:siteId', element: <SiteDetailsPage /> },
          { path: '/tasks/:taskId', element: <TaskDetailsPage /> },
          {
            element: <RequireRole role="executor" />,
            children: [{ path: '/my-tasks', element: <MyTasksPage /> }],
          },
        ],
      },
    ],
  },
]);
