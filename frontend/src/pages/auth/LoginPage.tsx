import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema } from '../../utils/validation';
import { authService } from '../../services/auth.service';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      await login(data.email, data.password);
      navigate('/home');
    } catch (err) {
      setError(authService.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Login" subtitle="Welcome back to your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          register={register('email')}
        />

        <FormField
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          register={register('password')}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={loading}>
          Sign In
        </Button>

        <div className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
