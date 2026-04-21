'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import type { SecuritySectionProps } from '@/types';
import { usePathname } from 'next/navigation';

export const SecuritySection = ({ isPending = false }: SecuritySectionProps) => {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3 md:rounded-xl md:p-5">
      <div className="mb-3 flex items-center justify-between md:mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 md:h-9 md:w-9 md:rounded-lg">
            <Lock className="h-3.5 w-3.5 text-emerald-400 md:h-4 md:w-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white md:text-lg">{isSpanish ? 'Seguridad' : 'Security'}</h2>
            <p className="hidden text-xs text-slate-400 md:block md:text-sm">
              {isSpanish ? 'Gestiona tu contraseña' : 'Manage your password'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-7 rounded-md border-slate-700/50 bg-slate-800/30 text-xs font-medium text-slate-300 hover:bg-slate-800/50 md:h-8 ${
            showPasswordFields ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' : ''
          }`}
          onClick={() => setShowPasswordFields(!showPasswordFields)}
        >
          {showPasswordFields ? (isSpanish ? 'Cancelar' : 'Cancel') : isSpanish ? 'Cambiar' : 'Change'}
        </Button>
      </div>

      <AnimatePresence>
        {showPasswordFields && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-xs font-medium text-slate-300 md:text-sm">
                {isSpanish ? 'Contraseña actual' : 'Current password'}
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                className="h-9 rounded-md border border-slate-700/50 bg-slate-800/30 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 md:h-10 md:rounded-lg md:text-base"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2 md:gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-medium text-slate-300 md:text-sm">
                  {isSpanish ? 'Nueva contraseña' : 'New password'}
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-9 rounded-md border border-slate-700/50 bg-slate-800/30 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500/50 md:h-10 md:rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300 md:text-sm">
                  {isSpanish ? 'Confirmar' : 'Confirm'}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-9 rounded-md border border-slate-700/50 bg-slate-800/30 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500/50 md:h-10 md:rounded-lg"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 md:text-sm">{isSpanish ? 'Mínimo 8 caracteres' : 'At least 8 characters'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPasswordFields && (
        <p className="text-xs text-slate-500 md:text-sm">{isSpanish ? 'Oculto por seguridad' : 'Hidden for security'}</p>
      )}
    </div>
  );
};
