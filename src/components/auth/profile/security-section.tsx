'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import type { SecuritySectionProps } from '@/types';
import { LogoutButton } from '@/components/auth/logout-button';

export const SecuritySection = ({ isPending = false }: SecuritySectionProps) => {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const portal = pathname.includes('/admin') ? 'admin' : pathname.includes('/sell') ? 'sell' : 'buy';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 md:h-9 md:w-9 md:rounded-lg">
            <Lock className="h-3.5 w-3.5 text-emerald-400 md:h-4 md:w-4" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg">{isSpanish ? 'Seguridad' : 'Security'}</CardTitle>
            <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
              {isSpanish ? 'Gestiona tu contraseña' : 'Manage your password'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-7 rounded-md text-xs font-medium md:h-8 ${
            showPasswordFields ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20' : ''
          }`}
          onClick={() => setShowPasswordFields(!showPasswordFields)}
        >
          {showPasswordFields ? (isSpanish ? 'Cancelar' : 'Cancel') : isSpanish ? 'Cambiar' : 'Change'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <AnimatePresence>
          {showPasswordFields && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs font-medium md:text-sm">
                  {isSpanish ? 'Contraseña actual' : 'Current password'}
                </Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-9 text-sm md:h-10 md:text-base"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2 md:gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium md:text-sm">
                    {isSpanish ? 'Nueva contraseña' : 'New password'}
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={isPending}
                    className="h-9 md:h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium md:text-sm">
                    {isSpanish ? 'Confirmar' : 'Confirm'}
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={isPending}
                    className="h-9 md:h-10"
                  />
                </div>
              </div>

              <p className="text-muted-foreground text-xs md:text-sm">{isSpanish ? 'Mínimo 8 caracteres' : 'At least 8 characters'}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!showPasswordFields && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs md:text-sm">{isSpanish ? 'Oculto por seguridad' : 'Hidden for security'}</p>
            <LogoutButton
              portal={portal}
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start md:justify-between"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
