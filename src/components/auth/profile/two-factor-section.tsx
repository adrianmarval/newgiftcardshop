'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ShieldCheck, Copy, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import type { TwoFactorSectionProps } from '@/types';
import { usePathname } from 'next/navigation';

export const TwoFactorSection = ({ initialEnabled }: TwoFactorSectionProps) => {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');
  const [is2FAEnabled, setIs2FAEnabled] = useState(initialEnabled);

  // Setup dialog state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoStepEnable, setTwoStepEnable] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Disable dialog state
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Shared state
  const [password, setPassword] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [is2FAPending, setIs2FAPending] = useState(false);

  const handleEnable2FA = async () => {
    if (!password) {
      toast.error(isSpanish ? 'Se requiere contraseña para habilitar 2FA' : 'Password is required to enable 2FA');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) {
        console.log('Error enabling 2FA:', error);
        toast.error(error.message || (isSpanish ? 'Error al habilitar 2FA' : 'Failed to enable 2FA'));
      } else if (data) {
        setQrCodeData(data.totpURI);
        setTwoStepEnable(true);
        setBackupCodes(data.backupCodes);
        setPassword('');
      }
    } catch (err) {
      console.log(err);
      toast.error('An unexpected error occurred');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleVerify2FA = async () => {
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.verifyTotp({
        code: totpCode,
      });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Código inválido' : 'Invalid code'));
      } else {
        setIs2FAEnabled(true);
        const responseData = data as { backupCodes?: string[] } | null;
        const codes = responseData?.backupCodes;
        if (codes) {
          setBackupCodes(codes);
        }
        setShowBackupCodes(true);
        setTotpCode('');
      }
    } catch (err) {
      console.log(err);
      toast.error('An unexpected error occurred');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!password) {
      toast.error(isSpanish ? 'Se requiere contraseña para regenerar códigos' : 'Password is required to regenerate backup codes');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({
        password,
      });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Error al regenerar códigos' : 'Failed to regenerate codes'));
      } else if (data) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setPassword('');
      }
    } catch (err) {
      console.log(err);
      toast.error('An unexpected error occurred');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      toast.error(isSpanish ? 'Se requiere contraseña para deshabilitar 2FA' : 'Password is required to disable 2FA');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Error al deshabilitar 2FA' : 'Failed to disable 2FA'));
      } else {
        setIs2FAEnabled(false);
        setShowDisableDialog(false);
        setPassword('');
      }
    } catch (err) {
      console.log(err);
      toast.error('An unexpected error occurred');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleClose2FADialog = (open: boolean) => {
    setShow2FADialog(open);
    if (!open) {
      setTwoStepEnable(false);
      setQrCodeData('');
      setTotpCode('');
      setTwoFactorError('');
      setPassword('');
    }
  };

  const handleCloseDisableDialog = (open: boolean) => {
    setShowDisableDialog(open);
    if (!open) {
      setPassword('');
      setTwoFactorError('');
    }
  };

  return (
    <>
      <Card className="group border-border bg-card/60 relative overflow-hidden p-5 backdrop-blur-sm md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="border-primary/20 bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner">
              <ShieldCheck className="text-primary h-6 w-6" />
            </div>
            <div>
              <h2 className="group-hover:text-primary flex items-center gap-2 text-xl font-bold transition-colors">
                2FA
                {is2FAEnabled && (
                  <span className="bg-primary/20 text-primary rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase">
                    {isSpanish ? 'ACTIVO' : 'ACTIVE'}
                  </span>
                )}
              </h2>
              <p className="text-muted-foreground text-base">{isSpanish ? 'Verificación de identidad' : 'Identity verification'}</p>
            </div>
          </div>

          {is2FAEnabled ? (
            <Button
              variant="destructive"
              size="sm"
              className="border-red-500/10 bg-red-500/10 px-4 font-bold text-red-500 transition-all hover:bg-red-500/20"
              onClick={() => setShowDisableDialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Deshabilitar' : 'Disable'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="shadow-primary/10 px-6 font-bold shadow-lg active:scale-95"
              onClick={() => setShow2FADialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Configurar' : 'Configure'}
            </Button>
          )}
        </div>

        {is2FAEnabled && (
          <div className="group/codes border-border mt-8 flex items-center justify-between border-t pt-8">
            <div>
              <h3 className="text-muted-foreground/80 text-xs font-black tracking-widest uppercase">
                {isSpanish ? 'Códigos de Respaldo' : 'Backup Codes'}
              </h3>
              <p className="text-muted-foreground/60 text-sm">
                {isSpanish ? 'Genera llaves de recuperación extra' : 'Generate extra recovery keys'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-muted/20 group-hover/codes:border-primary/30 hover:bg-muted/40 h-9 px-4 font-semibold transition-all"
              onClick={() => {
                setShow2FADialog(true);
                setTwoStepEnable(false);
                setShowBackupCodes(false);
              }}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5 transition-transform duration-500 group-hover/codes:rotate-180" />
              {isSpanish ? 'Gestionar' : 'Manage'}
            </Button>
          </div>
        )}

        {!is2FAEnabled && (
          <div className="border-primary/10 bg-primary/5 mt-6 rounded-xl border p-4">
            <p className="text-primary/80 text-xs leading-relaxed font-medium">
              {isSpanish
                ? 'Recomendamos encarecidamente habilitar 2FA. Esto añade un escudo extra a tus transacciones y datos personales dentro del ecosistema Solmaira.'
                : 'We highly recommend enabling 2FA. This adds an extra shield to your transactions and personal data within the Solmaira ecosystem.'}
            </p>
          </div>
        )}
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>
              {showBackupCodes
                ? isSpanish
                  ? 'Códigos de Respaldo'
                  : 'Backup Codes'
                : !twoStepEnable
                  ? isSpanish
                    ? 'Configurar Autenticación de Dos Factores'
                    : 'Set up Two-Factor Authentication'
                  : isSpanish
                    ? 'Escanear Código QR'
                    : 'Scan QR Code'}
            </DialogTitle>
            <DialogDescription>
              {showBackupCodes
                ? isSpanish
                  ? 'Guarda estos códigos en un lugar seguro. Son la única forma de recuperar tu cuenta si pierdes tu dispositivo.'
                  : 'Save these codes in a safe place. They are the only way to recover your account if you lose your device.'
                : !twoStepEnable
                  ? isSpanish
                    ? 'Protege tu cuenta con un método de verificación secundario.'
                    : 'Protect your account with a secondary verification method.'
                  : isSpanish
                    ? 'Escanea el código QR con tu aplicación de autenticación e ingresa el código.'
                    : 'Scan the QR code with your authenticator app and enter the code.'}
            </DialogDescription>
          </DialogHeader>

          {showBackupCodes ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold">{isSpanish ? 'Tus Códigos de Respaldo' : 'Your Backup Codes'}</h3>
                <p className="text-muted-foreground text-base">
                  {isSpanish
                    ? 'Cada código puede usarse solo una vez. Guárdalos en un lugar seguro.'
                    : 'Each code can be used only once. Keep them in a safe place.'}
                </p>
              </div>

              <div className="bg-muted/50 grid grid-cols-2 gap-2 rounded-xl border p-4 font-mono text-base">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between p-1">
                    <span>{code}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => {
                    const text = backupCodes.join('\n');
                    navigator.clipboard.writeText(text);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {isSpanish ? 'Copiar Todos los Códigos' : 'Copy All Codes'}
                </Button>
                <Button
                  onClick={() => {
                    setShow2FADialog(false);
                    setShowBackupCodes(false);
                    setTwoStepEnable(false);
                    setQrCodeData('');
                  }}
                  className="h-11 w-full font-semibold"
                >
                  {isSpanish ? 'He Guardado Estos Códigos' : "I've Saved These Codes"}
                </Button>
              </div>
            </div>
          ) : !twoStepEnable ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
                  {is2FAEnabled ? <RefreshCw className="text-primary h-8 w-8" /> : <ShieldCheck className="text-primary h-8 w-8" />}
                </div>
                <p className="text-base">
                  {is2FAEnabled
                    ? isSpanish
                      ? 'Verifica tu contraseña para generar un nuevo set de códigos de respaldo.'
                      : 'Verify your password to generate a new set of backup codes.'
                    : isSpanish
                      ? 'Recomendamos encarecidamente habilitar 2FA para mantener seguro tu portal de tarjetas de regalo.'
                      : 'We highly recommend enabling 2FA to keep your gift card portal secure.'}
                </p>
              </div>

              <div className="space-y-2">
                {twoFactorError && (
                  <Card className="border-destructive/20 bg-destructive/10 text-destructive p-3">
                    <AlertCircle className="mb-1 h-4 w-4" />
                    <span>{twoFactorError}</span>
                  </Card>
                )}
                <Label
                  htmlFor="setupPassword"
                  title={isSpanish ? 'Verifica tu contraseña para continuar' : 'Verify your password to continue'}
                >
                  {isSpanish ? 'Contraseña' : 'Password'}
                </Label>
                <Input
                  id="setupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSpanish ? 'Ingresa la contraseña de tu cuenta' : 'Enter your account password'}
                  className="bg-muted/50 h-11 border-none"
                />
              </div>

              {is2FAEnabled ? (
                <Button onClick={handleRegenerateBackupCodes} className="h-11 w-full font-semibold" disabled={is2FAPending || !password}>
                  {is2FAPending && <Spinner size="sm" className="mr-2" />}
                  {isSpanish ? 'Regenerar Códigos de Respaldo' : 'Regenerate Backup Codes'}
                </Button>
              ) : (
                <Button onClick={handleEnable2FA} className="h-11 w-full font-semibold" disabled={is2FAPending || !password}>
                  {is2FAPending && <Spinner size="sm" className="mr-2" />}
                  {isSpanish ? 'Habilitar Autenticador' : 'Enable Authenticator'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-xl bg-white p-4">{qrCodeData && <QRCodeSVG value={qrCodeData} size={200} />}</div>
                <p className="text-muted-foreground text-center font-mono text-xs tracking-widest break-all uppercase">{qrCodeData}</p>
              </div>

              <div className="space-y-2">
                {twoFactorError && (
                  <Card className="border-destructive/20 bg-destructive/10 text-destructive p-3">
                    <AlertCircle className="mb-1 h-4 w-4" />
                    <span>{twoFactorError}</span>
                  </Card>
                )}
                <Label htmlFor="totpCode" className="text-xs font-semibold tracking-wider uppercase opacity-70">
                  {isSpanish ? 'Código de Verificación' : 'Verification Code'}
                </Label>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="bg-muted/50 h-11 border-none text-center font-mono text-2xl tracking-[0.5em]"
                />
              </div>

              <Button onClick={handleVerify2FA} className="h-11 w-full" disabled={is2FAPending || totpCode.length !== 6}>
                {is2FAPending ? <Spinner size="sm" className="mr-2" /> : null}
                {isSpanish ? 'Verificar y Activar' : 'Verify and Activate'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={handleCloseDisableDialog}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>{isSpanish ? 'Deshabilitar Autenticación de Dos Factores' : 'Disable Two-Factor Authentication'}</DialogTitle>
            <DialogDescription>
              {isSpanish
                ? '¿Estás seguro de que quieres deshabilitar 2FA? Esto hará que tu cuenta sea menos segura.'
                : 'Are you sure you want to disable 2FA? This will make your account less secure.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">{isSpanish ? 'Contraseña de la Cuenta' : 'Account Password'}</Label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSpanish ? 'Confirma tu contraseña' : 'Confirm your password'}
                className="bg-muted/50 h-11 border-none"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              className="h-11 w-full font-semibold"
              disabled={is2FAPending || !password}
            >
              {is2FAPending ? <Spinner size="sm" className="mr-2" /> : null}
              {isSpanish ? 'Deshabilitar 2FA' : 'Disable 2FA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
