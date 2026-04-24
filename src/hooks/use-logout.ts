'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { logout } from '@/actions';

export const useLogout = (portal: 'buy' | 'sell' | 'admin') => {
  const router = useRouter();
  const isSpanish = portal === 'buy' || portal === 'admin';

  const { execute, status } = useAction(logout, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        toast.success(isSpanish ? 'Sesión cerrada correctamente' : 'Logged out successfully');
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || (isSpanish ? 'Error al cerrar sesión' : 'Logout failed'));
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
