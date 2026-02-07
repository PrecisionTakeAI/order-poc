import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { PasswordStrengthIndicator } from '../../components/auth/PasswordStrengthIndicator';
import { registerSchema } from '../../utils/validation';
import { authService } from '../../services/auth.service';

interface RegisterFormData {
  fullName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError('');

    try {
      await authService.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      });

      navigate('/login', {
        state: {
          message: 'Registration successful! You can now log in with your credentials.',
        },
      });
    } catch (err) {
      setError(authService.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Join us to start shopping">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        <FormField
          label="Full Name (Optional)"
          type="text"
          placeholder="John Doe"
          error={errors.fullName?.message}
          register={register('fullName')}
        />

        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          register={register('email')}
        />

        <FormField
          label="Phone Number (Optional)"
          type="tel"
          placeholder="+1234567890"
          error={errors.phoneNumber?.message}
          register={register('phoneNumber')}
        />

        <div>
          <FormField
            label="Password"
            type="password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            register={register('password')}
          />
          <div className="mt-2">
            <PasswordStrengthIndicator password={password || ''} />
          </div>
        </div>

        <FormField
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          register={register('confirmPassword')}
        />

        <Button type="submit" loading={loading}>
          Create Account
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
