'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import type { SecuritySectionProps } from '@/types';
import { usePathname } from 'next/navigation';

export function SecuritySection({ isPending = false }: SecuritySectionProps) {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  return (
    <Card className="border-border bg-card/60 relative overflow-hidden p-5 backdrop-blur-sm md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="border-primary/20 bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner">
            <Lock className="text-primary h-6 w-6" />
          </div>
          <div>
            <h2 className="text-foreground text-2xl font-bold">{isSpanish ? 'Seguridad' : 'Security'}</h2>
            <p className="text-muted-foreground text-base">{isSpanish ? 'Gestión de acceso' : 'Access management'}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`border-border px-4 text-xs font-bold tracking-wider uppercase transition-all ${showPasswordFields ? 'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-muted/40 hover:bg-muted/60'}`}
          onClick={() => setShowPasswordFields(!showPasswordFields)}
        >
          {showPasswordFields ? (isSpanish ? 'Cancelar' : 'Cancel') : isSpanish ? 'Modificar Contraseña' : 'Modify Password'}
        </Button>
      </div>

      <AnimatePresence>
        {showPasswordFields && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-muted-foreground/80 text-xs font-black tracking-widest uppercase">
                {isSpanish ? 'Contraseña Actual' : 'Current Password'}
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                className="border-border bg-muted/40 focus:ring-primary/20 dark:bg-muted/50 h-12 focus:ring-2"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-muted-foreground/80 text-xs font-black tracking-widest uppercase">
                  {isSpanish ? 'Nueva Contraseña' : 'New Password'}
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="border-border bg-muted/40 focus:ring-primary/20 dark:bg-muted/50 h-12 focus:ring-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground/80 text-xs font-black tracking-widest uppercase">
                  {isSpanish ? 'Confirmar Contraseña' : 'Confirm Password'}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="border-border bg-muted/40 focus:ring-primary/20 dark:bg-muted/50 h-12 focus:ring-2"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-muted-foreground/50 text-xs italic">
                {isSpanish
                  ? 'La contraseña debe tener al menos 8 caracteres con números y símbolos.'
                  : 'Password must be at least 8 characters long with numbers and symbols.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPasswordFields && (
        <div className="flex h-6 items-center">
          <p className="text-muted-foreground/40 text-sm italic">
            {isSpanish ? 'Los campos de contraseña están ocultos para tu protección.' : 'Password fields are hidden for your protection.'}
          </p>
        </div>
      )}
    </Card>
  );
}
