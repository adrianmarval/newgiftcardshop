'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
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
        // Reset success message after a delay
        setTimeout(() => setSuccess(false), 3000);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al actualizar el perfil' : 'Failed to update profile';
      toast.error(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    execute({ name: nameValue });
  };

  return (
    <div className="space-y-4">
      {success && (
        <Card className="border-primary/50 bg-primary/10 text-primary p-4">
          <CheckCircle className="mb-2 h-4 w-4" />
          <span>{isSpanish ? '¡Perfil actualizado con éxito!' : 'Profile updated successfully!'}</span>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="group border-border bg-card/60 relative overflow-hidden p-5 backdrop-blur-sm md:p-8">
          {/* Subtle background glow */}
          <div className="bg-primary/5 absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl" />

          <div className="mb-8 flex items-center gap-4">
            <div className="border-primary/20 bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner">
              <User className="text-primary h-6 w-6" />
            </div>
            <div>
              <h2 className="text-foreground text-2xl font-bold">{isSpanish ? 'Información Personal' : 'Personal Information'}</h2>
              <p className="text-muted-foreground text-base">
                {isSpanish ? 'Detalles generales de tu cuenta' : 'General details for your account'}
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground/80 text-xs font-black tracking-widest uppercase md:text-sm">
                {isSpanish ? 'Nombre Completo' : 'Full Name'}
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                disabled={status === 'executing'}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="border-border bg-muted/40 focus:ring-primary/20 dark:bg-muted/50 h-12 font-semibold transition-all focus:ring-2 md:h-14"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground/80 text-xs font-black tracking-widest uppercase md:text-sm">
                {isSpanish ? 'Correo Electrónico' : 'Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="border-border bg-muted/30 h-12 cursor-not-allowed border-dashed font-medium italic opacity-60 md:h-14"
              />
              <p className="text-muted-foreground/50 px-1 text-xs italic">
                {isSpanish ? 'Se requiere verificación para cambios' : 'Verification required for changes'}
              </p>
            </div>
          </div>

          <div className="border-border mt-8 flex items-center justify-between border-t pt-8">
            <div>
              <p className="text-muted-foreground/70 text-sm">
                {isSpanish ? 'Asegúrate de que tu información esté al día.' : 'Ensure your information is up to date.'}
              </p>
            </div>
            <Button
              type="submit"
              className="shadow-primary/20 h-12 px-10 text-sm font-black tracking-widest uppercase shadow-xl transition-all active:scale-95"
              disabled={status === 'executing'}
            >
              {status === 'executing' ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {isSpanish ? 'Guardando...' : 'Saving...'}
                </>
              ) : isSpanish ? (
                'Guardar Cambios'
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
