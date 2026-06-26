'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
import { useLocale } from '@/hooks/use-locale';
import { Enable2FAFlow, Verify2FAFlow } from './enable-2fa-flow';
import { Disable2FAFlow } from './disable-2fa-flow';
import { BackupCodesDisplay } from './backup-codes-display';

export interface TwoFactorSectionProps {
  initialEnabled: boolean;
}

export const TwoFactorSection = ({ initialEnabled }: TwoFactorSectionProps) => {
  const { isSpanish } = useLocale();
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

  const getEnableDialogTitle = () => {
    if (showBackupCodes) return isSpanish ? 'Códigos de Respaldo' : 'Backup Codes';
    if (!twoStepEnable) return isSpanish ? 'Configurar 2FA' : 'Set up 2FA';
    return isSpanish ? 'Escanear QR' : 'Scan QR Code';
  };

  const getEnableDialogDescription = () => {
    if (showBackupCodes) return isSpanish ? 'Guarda estos códigos en un lugar seguro' : 'Save these codes in a safe place';
    if (!twoStepEnable) return isSpanish ? 'Protege tu cuenta con verificación secundaria' : 'Protect your account with 2FA';
    return isSpanish ? 'Escanea con tu app autenticadora' : 'Scan with your authenticator app';
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
            <DialogTitle className="text-base font-medium md:text-lg">{getEnableDialogTitle()}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs md:text-sm">
              {getEnableDialogDescription()}
            </DialogDescription>
          </DialogHeader>

          {showBackupCodes ? (
            <BackupCodesDisplay
              isSpanish={isSpanish}
              backupCodes={backupCodes}
              onDone={() => {
                setShow2FADialog(false);
                setShowBackupCodes(false);
                setTwoStepEnable(false);
              }}
            />
          ) : !twoStepEnable ? (
            <Enable2FAFlow
              isSpanish={isSpanish}
              is2FAEnabled={is2FAEnabled}
              is2FAPending={is2FAPending}
              twoFactorError={twoFactorError}
              qrCodeData={qrCodeData}
              totpCode={totpCode}
              password={password}
              onPasswordChange={setPassword}
              onTotpCodeChange={setTotpCode}
              onEnable={handleEnable2FA}
              onVerify={handleVerify2FA}
              onRegenerate={handleRegenerateBackupCodes}
            />
          ) : (
            <Verify2FAFlow
              isSpanish={isSpanish}
              is2FAPending={is2FAPending}
              twoFactorError={twoFactorError}
              qrCodeData={qrCodeData}
              totpCode={totpCode}
              onTotpCodeChange={setTotpCode}
              onVerify={handleVerify2FA}
            />
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

          <Disable2FAFlow
            isSpanish={isSpanish}
            is2FAPending={is2FAPending}
            twoFactorError={twoFactorError}
            password={password}
            onPasswordChange={setPassword}
            onDisable={handleDisable2FA}
            onDismissError={() => setTwoFactorError('')}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
