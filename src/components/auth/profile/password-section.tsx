'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KeyRound } from 'lucide-react';
import { updateProfile } from '@/actions/auth/update-profile';
import { useAction } from 'next-safe-action/hooks';
import { Spinner } from '@/components/ui/spinner';
import { useLocale } from '@/hooks/use-locale';

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const PasswordSection = () => {
  const { isSpanish } = useLocale();
  const pathname = usePathname();
  const portal = pathname.includes('/admin') ? 'admin' : pathname.includes('/sell') ? 'sell' : 'buy';

  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string; description?: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<PasswordFormValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPasswordValue = watch('newPassword');

  const { execute: executeUpdate, status: updateStatus } = useAction(updateProfile, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setAlert({
          variant: 'success',
          title: isSpanish ? '¡Contraseña actualizada!' : 'Password updated!',
        });
        resetForm();
        setTimeout(() => setAlert(null), 3000);
      } else {
        const msg = data?.error || (isSpanish ? 'Error al actualizar contraseña' : 'Failed to update password');
        if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong')) {
          setError('currentPassword', { message: isSpanish ? 'La contraseña actual es incorrecta' : 'Current password is incorrect' });
          setAlert({
            variant: 'error',
            title: isSpanish ? 'La contraseña actual es incorrecta' : 'Current password is incorrect',
            description: isSpanish ? 'Verifica e intenta de nuevo' : 'Verify and try again',
          });
        } else {
          setAlert({ variant: 'error', title: msg });
        }
      }
    },
    onError: ({ error }) => {
      setAlert({ variant: 'error', title: error.serverError || (isSpanish ? 'Error al actualizar contraseña' : 'Failed to update password') });
    },
  });

  const isUpdating = updateStatus === 'executing';

  const onSubmit = (values: PasswordFormValues) => {
    setAlert(null);
    executeUpdate({
      name: '',
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    });
  };

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 md:h-9 md:w-9 md:rounded-lg">
          <KeyRound className="h-3.5 w-3.5 text-emerald-400 md:h-4 md:w-4" />
        </div>
        <div>
          <CardTitle className="text-sm md:text-lg">{isSpanish ? 'Contraseña' : 'Password'}</CardTitle>
          <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
            {isSpanish ? 'Cambia tu contraseña' : 'Change your password'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {alert && (
          <div className="mb-3">
            <InlineAlert
              variant={alert.variant}
              title={alert.title}
              description={alert.description}
              autoDismiss
              dismissAfter={4000}
              onDismiss={() => setAlert(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-medium md:text-sm">
              {isSpanish ? 'Contraseña actual' : 'Current password'}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              disabled={isUpdating}
              {...register('currentPassword', {
                required: isSpanish ? 'Ingresa tu contraseña actual' : 'Enter your current password',
              })}
              className={`h-9 text-sm md:h-10 md:text-base ${errors.currentPassword ? 'border-destructive' : ''}`}
            />
            {errors.currentPassword && <p className="text-destructive text-xs">{errors.currentPassword.message}</p>}
          </div>

          <div className="grid gap-1 md:grid-cols-2 md:gap-1">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-medium md:text-sm">
                {isSpanish ? 'Nueva contraseña' : 'New password'}
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                disabled={isUpdating}
                {...register('newPassword', {
                  required: isSpanish ? 'Ingresa la nueva contraseña' : 'Enter your new password',
                  minLength: { value: 8, message: isSpanish ? 'Mínimo 8 caracteres' : 'At least 8 characters' },
                })}
                className={`h-9 md:h-10 ${errors.newPassword ? 'border-destructive' : ''}`}
              />
              {errors.newPassword && <p className="text-destructive text-xs">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium md:text-sm">
                {isSpanish ? 'Confirmar' : 'Confirm'}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={isUpdating}
                {...register('confirmPassword', {
                  required: isSpanish ? 'Confirma la nueva contraseña' : 'Confirm your new password',
                  validate: (value) =>
                    value === newPasswordValue || (isSpanish ? 'Las contraseñas no coinciden' : 'Passwords do not match'),
                })}
                className={`h-9 md:h-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
              />
              {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs md:text-sm">{isSpanish ? 'Mínimo 8 caracteres' : 'At least 8 characters'}</p>
            <Button
              type="submit"
              size="sm"
              disabled={isUpdating || !isDirty}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-semibold"
            >
              {isUpdating ? <Spinner size="sm" className="text-white" /> : isSpanish ? 'Guardar' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
