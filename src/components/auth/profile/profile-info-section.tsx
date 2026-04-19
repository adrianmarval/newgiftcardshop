'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, User } from 'lucide-react';
import { updateProfile } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import type { ProfileInfoSectionProps } from '@/types';
import { usePathname } from 'next/navigation';

export const ProfileInfoSection = ({ name, email }: ProfileInfoSectionProps) => {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');
  const [nameValue, setNameValue] = useState(name);
  const [success, setSuccess] = useState(false);

  const { execute, status } = useAction(updateProfile, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al actualizar' : 'Failed to update';
      toast.error(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    execute({ name: nameValue });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/30 bg-slate-800/20 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <User className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">{isSpanish ? 'Información Personal' : 'Personal Info'}</h2>
            <p className="text-sm text-slate-400">{isSpanish ? 'Detalles de tu cuenta' : 'Your account details'}</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm text-emerald-300">{isSpanish ? '¡Perfil actualizado!' : 'Profile updated!'}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-300">
                {isSpanish ? 'Nombre' : 'Name'}
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                disabled={status === 'executing'}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                {isSpanish ? 'Correo' : 'Email'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="h-12 cursor-not-allowed rounded-xl border border-dashed border-slate-700/30 bg-slate-800/10 text-slate-400 opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">{isSpanish ? 'El correo no se puede cambiar' : 'Email cannot be changed'}</p>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
              disabled={status === 'executing'}
            >
              {status === 'executing' ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                </span>
              ) : isSpanish ? (
                'Guardar'
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
