import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Field, Input } from '@/shared/ui';
import { loginSchema, type LoginValues } from '../model/login-schema';
import { useLogin } from '../model/use-login';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((values) => login.mutate(values, { onSuccess }))}
    >
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" {...register('email')} />
      </Field>
      <Field label="Пароль" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
      </Field>
      {login.error && (
        <p role="alert" className="text-sm text-red-600">
          {login.error.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={login.isPending}>
        Войти
      </Button>
    </form>
  );
}
