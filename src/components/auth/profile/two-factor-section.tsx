'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoStepEnable, setTwoStepEnable] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [is2FAPending, setIs2FAPending] = useState(false);

  const handleEnable2FA = async () => {
    if (!password) {
      toast.error(isSpanish ? 'Se requiere contraseña' : 'Password is required');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Error al habilitar' : 'Failed to enable'));
      } else if (data) {
        setQrCodeData(data.totpURI);
        setTwoStepEnable(true);
        setBackupCodes(data.backupCodes);
        setPassword('');
      }
    } catch (err) {
      toast.error(isSpanish ? 'Error inesperado' : 'Unexpected error');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleVerify2FA = async () => {
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.verifyTotp({ code: totpCode });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Código inválido' : 'Invalid code'));
      } else {
        setIs2FAEnabled(true);
        const codes = (data as { backupCodes?: string[] })?.backupCodes;
        if (codes) setBackupCodes(codes);
        setShowBackupCodes(true);
        setTotpCode('');
      }
    } catch (err) {
      toast.error(isSpanish ? 'Error inesperado' : 'Unexpected error');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!password) {
      toast.error(isSpanish ? 'Se requiere contraseña' : 'Password required');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Error al regenerar' : 'Failed to regenerate'));
      } else if (data) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setPassword('');
      }
    } catch (err) {
      toast.error(isSpanish ? 'Error inesperado' : 'Unexpected error');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      toast.error(isSpanish ? 'Se requiere contraseña' : 'Password required');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        toast.error(error.message || (isSpanish ? 'Error al deshabilitar' : 'Failed to disable'));
      } else {
        setIs2FAEnabled(false);
        setShowDisableDialog(false);
        setPassword('');
      }
    } catch (err) {
      toast.error(isSpanish ? 'Error inesperado' : 'Unexpected error');
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

  return (
    <>
      <div className="rounded-2xl border border-slate-700/30 bg-slate-800/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${is2FAEnabled ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}
            >
              <ShieldCheck className={`h-5 w-5 ${is2FAEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">2FA</h2>
              <p className="text-sm text-slate-400">{isSpanish ? 'Verificación en dos pasos' : 'Two-factor authentication'}</p>
            </div>
          </div>

          {is2FAEnabled ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-9 rounded-lg border border-red-500/20 bg-red-500/10 text-xs font-medium text-red-400 hover:bg-red-500/20"
              onClick={() => setShowDisableDialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Desactivar' : 'Disable'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 rounded-lg bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400"
              onClick={() => setShow2FADialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Activar' : 'Enable'}
            </Button>
          )}
        </div>

        {is2FAEnabled && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-700/30 pt-4">
            <p className="text-xs text-emerald-400">{isSpanish ? 'Tu cuenta está protegida' : 'Your account is protected'}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-slate-700/50 bg-slate-800/30 text-xs font-medium text-slate-300 hover:bg-slate-800/50"
              onClick={() => {
                setShow2FADialog(true);
                setTwoStepEnable(false);
                setShowBackupCodes(false);
              }}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              {isSpanish ? 'Códigos' : 'Codes'}
            </Button>
          </div>
        )}

        {!is2FAEnabled && (
          <p className="mt-6 text-xs text-slate-500">
            {isSpanish ? 'Recomendamos habilitar 2FA para mayor seguridad' : 'We recommend enabling 2FA for better security'}
          </p>
        )}
      </div>

      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent className="max-w-sm rounded-2xl border border-slate-700/50 bg-[#0d1117] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-white">
              {showBackupCodes
                ? isSpanish
                  ? 'Códigos de Respaldo'
                  : 'Backup Codes'
                : !twoStepEnable
                  ? isSpanish
                    ? 'Configurar 2FA'
                    : 'Set up 2FA'
                  : isSpanish
                    ? 'Escanear QR'
                    : 'Scan QR Code'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {showBackupCodes
                ? isSpanish
                  ? 'Guarda estos códigos en un lugar seguro'
                  : 'Save these codes in a safe place'
                : !twoStepEnable
                  ? isSpanish
                    ? 'Protege tu cuenta con verificación secundaria'
                    : 'Protect your account with 2FA'
                  : isSpanish
                    ? 'Escanea con tu app autenticadora'
                    : 'Scan with your authenticator app'}
            </DialogDescription>
          </DialogHeader>

          {showBackupCodes ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-sm text-slate-400">{isSpanish ? 'Cada código se usa solo una vez' : 'Each code can be used once'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700/30 bg-slate-800/20 p-3 font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between p-1">
                    <span className="text-slate-300">{code}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="h-10 w-full rounded-xl border-slate-700/50 bg-slate-800/30 text-sm font-medium text-slate-300 hover:bg-slate-800/50"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                {isSpanish ? 'Copiar Todos' : 'Copy All'}
              </Button>
              <Button
                onClick={() => {
                  setShow2FADialog(false);
                  setShowBackupCodes(false);
                  setTwoStepEnable(false);
                }}
                className="h-10 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
              >
                {isSpanish ? 'He Guardado' : "I've Saved"}
              </Button>
            </div>
          ) : !twoStepEnable ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/30">
                  {is2FAEnabled ? <RefreshCw className="h-6 w-6 text-slate-300" /> : <ShieldCheck className="h-6 w-6 text-slate-300" />}
                </div>
                <p className="text-sm text-slate-400">
                  {is2FAEnabled
                    ? isSpanish
                      ? 'Verifica tu contraseña para generar nuevos códigos'
                      : 'Verify your password to generate new codes'
                    : isSpanish
                      ? 'Habilita 2FA para mayor protección'
                      : 'Enable 2FA for better protection'}
                </p>
              </div>

              {twoFactorError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">{twoFactorError}</span>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="setupPassword" className="text-sm font-medium text-slate-300">
                  {isSpanish ? 'Contraseña' : 'Password'}
                </Label>
                <Input
                  id="setupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                />
              </div>

              <Button
                onClick={is2FAEnabled ? handleRegenerateBackupCodes : handleEnable2FA}
                className="h-11 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
                disabled={is2FAPending || !password}
              >
                {is2FAPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" className="text-white" />
                  </span>
                ) : is2FAEnabled ? (
                  isSpanish ? (
                    'Regenerar Códigos'
                  ) : (
                    'Regenerate Codes'
                  )
                ) : isSpanish ? (
                  'Habilitar'
                ) : (
                  'Enable'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="rounded-xl bg-white p-4">{qrCodeData && <QRCodeSVG value={qrCodeData} size={160} />}</div>
                <p className="text-xs break-all text-slate-400">{qrCodeData}</p>
              </div>

              {twoFactorError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">{twoFactorError}</span>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="totpCode" className="text-sm font-medium text-slate-300">
                  {isSpanish ? 'Código' : 'Code'}
                </Label>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-center font-mono text-xl tracking-[0.5em] text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                />
              </div>

              <Button
                onClick={handleVerify2FA}
                className="h-11 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
                disabled={is2FAPending || totpCode.length !== 6}
              >
                {is2FAPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" className="text-white" />
                  </span>
                ) : isSpanish ? (
                  'Verificar'
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDisableDialog} onOpenChange={(open) => setShowDisableDialog(open)}>
        <DialogContent className="max-w-sm rounded-2xl border border-slate-700/50 bg-[#0d1117] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-white">{isSpanish ? 'Deshabilitar 2FA' : 'Disable 2FA'}</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {isSpanish ? '¿Estás seguro? Tu cuenta será menos segura.' : 'Are you sure? Your account will be less secure.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="disablePassword" className="text-sm font-medium text-slate-300">
                {isSpanish ? 'Contraseña' : 'Password'}
              </Label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              className="h-11 w-full rounded-xl text-sm font-semibold"
              disabled={is2FAPending || !password}
            >
              {is2FAPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                </span>
              ) : isSpanish ? (
                'Deshabilitar 2FA'
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
