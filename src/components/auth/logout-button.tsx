'use client';

import { Button } from '@/components/ui/button';
import { IconLogout } from '@tabler/icons-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/use-logout';
import { AppSection } from '@/types';

interface LogoutButtonProps {
  portal: AppSection;
  className?: string;
  variant?: 'link' | 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | null | undefined;
  showIcon?: boolean;
}

export const LogoutButton = ({ portal, className, variant = 'destructive', showIcon = true }: LogoutButtonProps) => {
  const { handleLogout, isLoggingOut } = useLogout(portal);
  const isSpanish = portal === 'buy' || portal === 'admin';

  return (
    <Button variant={variant} className={cn('gap-2', className)} disabled={isLoggingOut} onClick={handleLogout}>
      {isLoggingOut ? <Spinner size="sm" /> : showIcon && <IconLogout size={18} />}
      {isSpanish ? 'Cerrar Sesión' : 'Logout'}
    </Button>
  );
};
