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
    <div className="rounded-2xl border border-slate-700/30 bg-slate-800/20 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Lock className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">{isSpanish ? 'Seguridad' : 'Security'}</h2>
            <p className="text-sm text-slate-400">{isSpanish ? 'Gestiona tu contraseña' : 'Manage your password'}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-9 rounded-lg border-slate-700/50 bg-slate-800/30 text-xs font-medium text-slate-300 hover:bg-slate-800/50 ${
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
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-3">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-300">
                {isSpanish ? 'Contraseña actual' : 'Current password'}
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-300">
                  {isSpanish ? 'Nueva contraseña' : 'New password'}
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
                  {isSpanish ? 'Confirmar' : 'Confirm'}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {isSpanish ? 'Mínimo 8 caracteres con números y símbolos' : 'At least 8 characters with numbers and symbols'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPasswordFields && (
        <p className="text-xs text-slate-500">{isSpanish ? 'Los campos están ocultos por seguridad' : 'Fields are hidden for security'}</p>
      )}
    </div>
  );
};
