'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface Enable2FAFlowProps {
  isSpanish: boolean;
  is2FAEnabled: boolean;
  is2FAPending: boolean;
  twoFactorError: string;
  qrCodeData: string;
  totpCode: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onTotpCodeChange: (value: string) => void;
  onEnable: () => void;
  onVerify: () => void;
  onRegenerate: () => void;
}

export const Enable2FAFlow = ({
  isSpanish,
  is2FAEnabled,
  is2FAPending,
  twoFactorError,
  qrCodeData: _qrCodeData,
  totpCode: _totpCode,
  password,
  onPasswordChange,
  onTotpCodeChange: _onTotpCodeChange,
  onEnable,
  onVerify: _onVerify,
  onRegenerate,
}: Enable2FAFlowProps) => {
  return (
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
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          className="h-9 text-sm md:h-10 md:text-base"
        />
      </div>

      <Button
        onClick={is2FAEnabled ? onRegenerate : onEnable}
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
  );
};

export interface Verify2FAFlowProps {
  isSpanish: boolean;
  is2FAPending: boolean;
  twoFactorError: string;
  qrCodeData: string;
  totpCode: string;
  onTotpCodeChange: (value: string) => void;
  onVerify: () => void;
}

export const Verify2FAFlow = ({
  isSpanish,
  is2FAPending,
  twoFactorError,
  qrCodeData,
  totpCode,
  onTotpCodeChange,
  onVerify,
}: Verify2FAFlowProps) => {
  return (
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
          onChange={(e) => onTotpCodeChange(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="h-10 text-center font-mono text-base tracking-[0.25em] md:text-lg"
        />
      </div>

      <Button
        onClick={onVerify}
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
  );
};
