'use client';

import { useRouter } from 'next/navigation';
import { showAlert } from '@/lib/swal';
import { useAction } from 'next-safe-action/hooks';
import { logout } from '@/actions';
import { AppSection } from '@/types';

export const useLogout = (portal: AppSection) => {
  const router = useRouter();
  const isSpanish = portal === 'buy' || portal === 'admin';

  const { execute, status } = useAction(logout, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        showAlert.toast.success(isSpanish ? 'Sesión cerrada correctamente' : 'Logged out successfully');
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || (isSpanish ? 'Error al cerrar sesión' : 'Logout failed'));
    },
  });

  const handleLogout = () => {
    execute({ portal });
  };

  return {
    handleLogout,
    isLoggingOut: status === 'executing',
  };
};
