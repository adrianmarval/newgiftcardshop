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
    <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3 md:rounded-xl md:p-5">
      <div className="mb-3 flex items-center gap-2 md:mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 md:h-9 md:w-9 md:rounded-lg">
          <User className="h-3.5 w-3.5 text-emerald-400 md:h-4 md:w-4" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-white md:text-lg">{isSpanish ? 'Información Personal' : 'Personal Info'}</h2>
          <p className="hidden text-xs text-slate-400 md:block md:text-sm">
            {isSpanish ? 'Detalles de tu cuenta' : 'Your account details'}
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 md:mb-4">
          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-300 md:text-sm">{isSpanish ? '¡Perfil actualizado!' : 'Profile updated!'}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2 md:gap-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-medium text-slate-300 md:text-sm">
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
              className="h-9 rounded-md border border-slate-700/50 bg-slate-800/30 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 md:h-10 md:rounded-lg md:text-base"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs font-medium text-slate-300 md:text-sm">
              {isSpanish ? 'Correo' : 'Email'}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="h-9 cursor-not-allowed rounded-md border border-dashed border-slate-700/30 bg-slate-800/10 text-xs text-slate-400 opacity-60 md:h-10 md:rounded-lg md:text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 md:text-sm">{isSpanish ? 'El correo no se puede cambiar' : 'Email cannot be changed'}</p>
          <Button
            type="submit"
            className="h-8 rounded-md bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 md:h-9 md:rounded-lg md:text-sm"
            disabled={status === 'executing'}
          >
            {status === 'executing' ? (
              <span className="flex items-center gap-1.5">
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
  );
};
