import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { PasswordStrengthIndicator } from '../../components/auth/PasswordStrengthIndicator';
import { resetPasswordSchema } from '../../utils/validation';
import { authService } from '../../services/auth.service';

interface ResetPasswordFormData {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const prefilledEmail = (location.state as { email?: string })?.email || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: prefilledEmail,
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    setError('');

    try {
      await authService.resetPassword({
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
      });

      navigate('/login', {
        state: {
          message: 'Password reset successful! You can now log in with your new password.',
        },
      });
    } catch (err) {
      setError(authService.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter the code sent to your email and create a new password"
    >
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
          label="Verification Code"
          type="text"
          placeholder="Enter 6-digit code"
          error={errors.code?.message}
          register={register('code')}
        />

        <div>
          <FormField
            label="New Password"
            type="password"
            placeholder="Create a strong password"
            error={errors.newPassword?.message}
            register={register('newPassword')}
          />
          <div className="mt-2">
            <PasswordStrengthIndicator password={newPassword || ''} />
          </div>
        </div>

        <FormField
          label="Confirm New Password"
          type="password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          register={register('confirmPassword')}
        />

        <Button type="submit" loading={loading}>
          Reset Password
        </Button>

        <div className="text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
