'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ShieldCheck, Copy, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth/auth-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { QRCodeSVG } from 'qrcode.react';
import { usePathname } from 'next/navigation';
import { copyToClipboard } from '@/lib/utils/clipboard';

export interface TwoFactorSectionProps {
  initialEnabled: boolean;
}

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
      setTwoFactorError(isSpanish ? 'Se requiere contraseña' : 'Password is required');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) {
        setTwoFactorError(error.message || (isSpanish ? 'Error al habilitar' : 'Failed to enable'));
      } else if (data) {
        setQrCodeData(data.totpURI);
        setTwoStepEnable(true);
        setBackupCodes(data.backupCodes);
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setTwoFactorError(isSpanish ? 'Error inesperado' : 'Unexpected error');
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
        setTwoFactorError(error.message || (isSpanish ? 'Código inválido' : 'Invalid code'));
      } else {
        setIs2FAEnabled(true);
        const codes = (data as { backupCodes?: string[] })?.backupCodes;
        if (codes) setBackupCodes(codes);
        setShowBackupCodes(true);
        setTotpCode('');
      }
    } catch (err) {
      console.error(err);
      setTwoFactorError(isSpanish ? 'Error inesperado' : 'Unexpected error');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!password) {
      setTwoFactorError(isSpanish ? 'Se requiere contraseña' : 'Password is required');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error) {
        setTwoFactorError(error.message || (isSpanish ? 'Error al regenerar' : 'Failed to regenerate'));
      } else if (data) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setTwoFactorError(isSpanish ? 'Error inesperado' : 'Unexpected error');
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      setTwoFactorError(isSpanish ? 'Se requiere contraseña' : 'Password is required');
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError('');
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        setTwoFactorError(error.message || (isSpanish ? 'Error al deshabilitar' : 'Failed to disable'));
      } else {
        setIs2FAEnabled(false);
        setShowDisableDialog(false);
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setTwoFactorError(isSpanish ? 'Error inesperado' : 'Unexpected error');
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
      <Card className="gap-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-md md:h-9 md:w-9 ${is2FAEnabled ? 'bg-emerald-500/10' : 'bg-muted'}`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 md:h-4 md:w-4 ${is2FAEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-sm md:text-lg">2FA</CardTitle>
              <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
                {isSpanish ? 'Verificación en dos pasos' : 'Two-factor authentication'}
              </p>
            </div>
          </div>

          {is2FAEnabled ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 rounded-md text-xs font-medium md:h-8"
              onClick={() => setShowDisableDialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Desactivar' : 'Disable'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-8"
              onClick={() => setShow2FADialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? 'Activar' : 'Enable'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {is2FAEnabled && (
            <div className="border-border flex items-center justify-between border-t pt-2 md:pt-3">
              <p className="text-xs text-emerald-400 md:text-sm">{isSpanish ? 'Protegida' : 'Protected'}</p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 rounded-md text-xs font-medium md:h-7 md:text-sm"
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
            <p className="text-muted-foreground text-xs md:text-sm">
              {isSpanish ? 'Habilita 2FA para mayor seguridad' : 'Enable 2FA for better security'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent className="max-w-sm rounded-lg p-4 md:rounded-xl md:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-medium md:text-lg">
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
            <DialogDescription className="text-muted-foreground text-xs md:text-sm">
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
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-muted-foreground text-xs md:text-sm">
                  {isSpanish ? 'Cada código se usa solo una vez' : 'Each code can be used once'}
                </p>
              </div>

              <div className="border-border bg-muted/50 grid grid-cols-2 gap-1 rounded-md border p-2 font-mono text-xs md:gap-1.5 md:p-2.5 md:text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between p-0.5">
                    <span>{code}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="h-8 w-full rounded-md text-xs font-medium md:h-9 md:text-sm"
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
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
                className="h-8 w-full rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-9 md:text-sm"
              >
                {isSpanish ? 'He Guardado' : "I've Saved"}
              </Button>
            </div>
          ) : !twoStepEnable ? (
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-full">
                  <ShieldCheck className="text-muted-foreground h-4 w-4" />
                </div>
                <p className="text-muted-foreground text-xs md:text-sm">
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
                <div className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 p-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">{twoFactorError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="setupPassword" className="text-xs font-medium md:text-sm">
                  {isSpanish ? 'Contraseña' : 'Password'}
                </Label>
                <Input
                  id="setupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-sm md:h-10 md:text-base"
                />
              </div>

              <Button
                onClick={is2FAEnabled ? handleRegenerateBackupCodes : handleEnable2FA}
                className="h-8 w-full rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-9 md:text-sm"
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
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="rounded-md bg-white p-2">{qrCodeData && <QRCodeSVG value={qrCodeData} size={120} />}</div>
                <p className="text-muted-foreground text-xs break-all md:text-sm">{qrCodeData}</p>
              </div>

              {twoFactorError && (
                <div className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 p-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">{twoFactorError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="totpCode" className="text-xs font-medium md:text-sm">
                  {isSpanish ? 'Código' : 'Code'}
                </Label>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="h-10 text-center font-mono text-base tracking-[0.25em] md:text-lg"
                />
              </div>

              <Button
                onClick={handleVerify2FA}
                className="h-9 w-full rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-10"
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
        <DialogContent className="max-w-sm rounded-lg p-4 md:rounded-xl md:p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium md:text-base">{isSpanish ? 'Deshabilitar 2FA' : 'Disable 2FA'}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-[10px] md:text-xs">
              {isSpanish ? '¿Estás seguro? Tu cuenta será menos segura.' : 'Are you sure? Your account will be less secure.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {twoFactorError && (
              <InlineAlert variant="error" title={twoFactorError} autoDismiss dismissAfter={3000} onDismiss={() => setTwoFactorError('')} />
            )}

            <div className="space-y-1.5">
              <Label htmlFor="disablePassword" className="text-[10px] font-medium md:text-xs">
                {isSpanish ? 'Contraseña' : 'Password'}
              </Label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-xs md:h-10 md:text-sm"
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
