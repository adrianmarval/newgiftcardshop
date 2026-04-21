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
      <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3 md:rounded-xl md:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-md md:h-9 md:w-9 ${is2FAEnabled ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 md:h-4 md:w-4 ${is2FAEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white md:text-lg">2FA</h2>
              <p className="hidden text-xs text-slate-400 md:block md:text-sm">
                {isSpanish ? 'Verificación en dos pasos' : 'Two-factor authentication'}
              </p>
            </div>
          </div>

          {is2FAEnabled ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 rounded-md border border-red-500/20 bg-red-500/10 text-xs font-medium text-red-400 hover:bg-red-500/20 md:h-8"
              onClick={() => setShowDisableDialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Desactivar' : 'Disable'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 rounded-md bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 md:h-8"
              onClick={() => setShow2FADialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Activar' : 'Enable'}
            </Button>
          )}
        </div>

        {is2FAEnabled && (
          <div className="mt-2 flex items-center justify-between border-t border-slate-700/30 pt-2 md:mt-4 md:pt-3">
            <p className="text-xs text-emerald-400 md:text-sm">{isSpanish ? 'Protegida' : 'Protected'}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-6 rounded-md border-slate-700/50 bg-slate-800/30 text-xs font-medium text-slate-300 hover:bg-slate-800/50 md:h-7 md:text-sm"
              onClick={() => {
                setShow2FADialog(true);
                setTwoStepEnable(false);
                setShowBackupCodes(false);
              }}
            >
              <RefreshCw className="mr-1 h-2.5 w-2.5" />
              {isSpanish ? 'Códigos' : 'Codes'}
            </Button>
          </div>
        )}

        {!is2FAEnabled && (
          <p className="mt-2 text-xs text-slate-500 md:mt-4 md:text-sm">
            {isSpanish ? 'Habilita 2FA para mayor seguridad' : 'Enable 2FA for better security'}
          </p>
        )}
      </div>

      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent className="max-w-sm rounded-lg border border-slate-700/50 bg-[#0d1117] p-4 md:rounded-xl md:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-white md:text-lg">
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
            <DialogDescription className="text-xs text-slate-400 md:text-sm">
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
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-400 md:text-sm">
                  {isSpanish ? 'Cada código se usa solo una vez' : 'Each code can be used once'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-700/30 bg-slate-800/20 p-2 font-mono text-xs md:gap-1.5 md:p-2.5 md:text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between p-0.5">
                    <span className="text-slate-300">{code}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="h-8 w-full rounded-md border-slate-700/50 bg-slate-800/30 text-xs font-medium text-slate-300 hover:bg-slate-800/50 md:h-9 md:text-sm"
                onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
              >
                <Copy className="mr-1 h-2.5 w-2.5" />
                {isSpanish ? 'Copiar Todos' : 'Copy All'}
              </Button>
              <Button
                onClick={() => {
                  setShow2FADialog(false);
                  setShowBackupCodes(false);
                  setTwoStepEnable(false);
                }}
                className="h-8 w-full rounded-md bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 md:h-9 md:text-sm"
              >
                {isSpanish ? 'He Guardado' : "I've Saved"}
              </Button>
            </div>
          ) : !twoStepEnable ? (
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/30">
                  <ShieldCheck className="h-4 w-4 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 md:text-sm">
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
                <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">{twoFactorError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="setupPassword" className="text-xs font-medium text-slate-300 md:text-sm">
                  {isSpanish ? 'Contraseña' : 'Password'}
                </Label>
                <Input
                  id="setupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 rounded-md border border-slate-700/50 bg-slate-800/30 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 md:h-10 md:rounded-lg md:text-base"
                />
              </div>

              <Button
                onClick={is2FAEnabled ? handleRegenerateBackupCodes : handleEnable2FA}
                className="h-8 w-full rounded-md bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 md:h-9 md:text-sm"
                disabled={is2FAPending || !password}
              >
                {is2FAPending ? (
                  <span className="flex items-center gap-1.5">
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
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="rounded-md bg-white p-2">{qrCodeData && <QRCodeSVG value={qrCodeData} size={120} />}</div>
                <p className="text-xs break-all text-slate-400 md:text-sm">{qrCodeData}</p>
              </div>

              {twoFactorError && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">{twoFactorError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="totpCode" className="text-xs font-medium text-slate-300 md:text-sm">
                  {isSpanish ? 'Código' : 'Code'}
                </Label>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="h-10 rounded-md border border-slate-700/50 bg-slate-800/30 text-center font-mono text-base tracking-[0.25em] text-white placeholder:text-slate-500 focus:border-emerald-500/50 md:text-lg"
                />
              </div>

              <Button
                onClick={handleVerify2FA}
                className="h-9 w-full rounded-md bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 md:h-10"
                disabled={is2FAPending || totpCode.length !== 6}
              >
                {is2FAPending ? (
                  <span className="flex items-center gap-1.5">
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
        <DialogContent className="max-w-sm rounded-lg border border-slate-700/50 bg-[#0d1117] p-4 md:rounded-xl md:p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-white md:text-base">
              {isSpanish ? 'Deshabilitar 2FA' : 'Disable 2FA'}
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 md:text-xs">
              {isSpanish ? '¿Estás seguro? Tu cuenta será menos segura.' : 'Are you sure? Your account will be less secure.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="disablePassword" className="text-[10px] font-medium text-slate-300 md:text-xs">
                {isSpanish ? 'Contraseña' : 'Password'}
              </Label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 rounded-md border border-slate-700/50 bg-slate-800/30 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500/50 md:h-10 md:rounded-lg"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              className="h-9 w-full rounded-md text-[10px] font-semibold md:h-10 md:text-xs"
              disabled={is2FAPending || !password}
            >
              {is2FAPending ? (
                <span className="flex items-center gap-1.5">
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
