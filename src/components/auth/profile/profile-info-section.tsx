'use client';

import { useState } from 'react';
import { showAlert } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TelegramAvatar } from '@/components/common';
import { CheckCircle, User, MessageCircle, Link2 } from 'lucide-react';
import { updateProfile } from '@/actions/auth/update-profile';
import { useAction } from 'next-safe-action/hooks';
import type { AppSection } from '@/types';
import Link from 'next/link';
import { useLocale } from '@/hooks/use-locale';

export interface ProfileInfoSectionProps {
  name: string;
  email: string;
  emailVerified: boolean;
  portal: AppSection;
  telegramUser?: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    hasPhoto: boolean;
    languageCode: string | null;
  } | null;
  telegramPhotoDataUrl?: string | null;
  telegramLinkUrl?: string | null;
}

export const ProfileInfoSection = ({
  name,
  email,
  emailVerified,
  portal,
  telegramUser,
  telegramPhotoDataUrl,
  telegramLinkUrl,
}: ProfileInfoSectionProps) => {
  const { isSpanish } = useLocale();
  const [nameValue, setNameValue] = useState(name);
  const [success, setSuccess] = useState(false);

  const { execute, status } = useAction(updateProfile, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else if (data?.error) {
        const defaultError = isSpanish ? 'Error al actualizar' : 'Failed to update';
        showAlert.error('Error', data.error || defaultError);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al actualizar' : 'Failed to update';
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setSuccess(false);
    execute({ name: nameValue });
  };

  const showTelegramLinkBanner = portal !== 'admin' && !telegramUser;

  return (
    <>
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="text-sm md:text-lg">{isSpanish ? 'Información Personal' : 'Personal Info'}</CardTitle>
          <CardDescription className="text-muted-foreground hidden text-xs md:block md:text-sm">
            {isSpanish ? 'Detalles de tu cuenta' : 'Your account details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <p className="text-xs text-emerald-300 md:text-sm">{isSpanish ? '¡Perfil actualizado!' : 'Profile updated!'}</p>
            </div>
          )}

          {showTelegramLinkBanner && (
            <div className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <Link2 className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-300">{isSpanish ? 'Vincular Telegram' : 'Link Telegram'}</p>
                <p className="text-xs text-slate-400">
                  {emailVerified
                    ? isSpanish
                      ? 'Conectá tu cuenta para ver tu foto de perfil.'
                      : 'Link your account to see your profile photo.'
                    : isSpanish
                      ? 'Verificá tu email para vincular Telegram.'
                      : 'Verify your email to link Telegram.'}
                </p>
              </div>
              {emailVerified ? (
                <Link
                  href={telegramLinkUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
                >
                  {isSpanish ? 'Vincular' : 'Link'}
                </Link>
              ) : (
                <span className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400">
                  {isSpanish ? 'Verificar email' : 'Verify email'}
                </span>
              )}
            </div>
          )}

          {telegramUser && (
            <div className="flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
              {telegramUser.hasPhoto ? (
                <TelegramAvatar
                  src={telegramPhotoDataUrl || ''}
                  name={`${telegramUser.firstName || ''} ${telegramUser.lastName || ''}`.trim() || name}
                  size="lg"
                  className="ring-2 ring-blue-500/50"
                />
              ) : (
                <TelegramAvatar
                  name={`${telegramUser.firstName || ''} ${telegramUser.lastName || ''}`.trim() || name}
                  size="lg"
                  className="ring-2 ring-blue-500/50"
                />
              )}
              <div className="flex flex-col gap-0.5">
                {telegramUser.username ? (
                  <span className="text-sm font-medium text-blue-300">@{telegramUser.username}</span>
                ) : (
                  <span className="text-xs text-slate-400">Sin username</span>
                )}
                {(telegramUser.firstName || telegramUser.lastName) && (
                  <span className="text-xs text-slate-400">
                    {telegramUser.firstName} {telegramUser.lastName}
                  </span>
                )}
                {telegramUser.languageCode && <span className="text-xs text-slate-500 uppercase">{telegramUser.languageCode}</span>}
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2 py-1">
                <MessageCircle className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-300">Telegram</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-1 md:grid-cols-2 md:gap-1">
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

            <div className="flex items-center justify-between gap-1">
              <p className="text-xs text-slate-500 md:text-sm">{isSpanish ? 'El correo no se puede cambiar' : 'Email cannot be changed'}</p>
              <Button
                type="submit"
                className="h-8 rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-9 md:rounded-lg md:text-sm"
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
        </CardContent>
      </Card>
    </>
  );
};
