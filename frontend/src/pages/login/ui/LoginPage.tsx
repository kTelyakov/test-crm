import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth-login';
import { Card } from '@/shared/ui';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto max-w-sm p-6 pt-16">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">Вход</h1>
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      </Card>
    </main>
  );
}
