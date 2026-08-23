'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Fingerprint, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { showAlert } from '@/lib/ui';
import {
  getSecurityStatusAction,
  unlockWithPin,
  unlockWithPasskey,
  setSecurityPinAction,
  requestPinResetAction,
  confirmPinResetAction,
} from '@/actions/buyer/security';
import { isWebAuthnSupported, isPasskeyCancellation, runPasskeyAuthentication } from '@/components/auth/passkey/passkey-utils';

type GateMode = 'loading' | 'unlock' | 'setup' | 'reset_request' | 'reset_confirm';

interface SecurityStatusState {
  hasPin: boolean;
  hasPasskey: boolean;
  pinLocked: boolean;
}

interface UnlockGateProps {
  /** Called once the buyer holds a valid unlock window — parent should refetch the codes. */
  onUnlocked: () => void;
  title?: string;
  description?: string;
}

const subscribeNoop = () => () => {};

/**
 * Gate de seguridad para revelar códigos de órdenes con cards sin confirmar.
 * Prioriza passkey (si hay y WebAuthn está soportado), fallback a PIN.
 * Si el buyer no tiene nada configurado, fuerza el setup de PIN inline.
 * Incluye recuperación de PIN via OTP por email.
 */
export function UnlockGate({
  onUnlocked,
  title = 'Códigos protegidos',
  description = 'Por seguridad, los códigos de esta orden solo se muestran después de verificar tu identidad.',
}: UnlockGateProps) {
  const [mode, setMode] = useState<GateMode>('loading');
  const [status, setStatus] = useState<SecurityStatusState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');

  const webAuthnSupported = useSyncExternalStore(subscribeNoop, isWebAuthnSupported, () => false);

  useEffect(() => {
    getSecurityStatusAction().then((result) => {
      const data = result?.data;
      if (data?.success) {
        if (data.isUnlocked) {
          onUnlocked();
          return;
        }
        setStatus({ hasPin: data.hasPin, hasPasskey: data.hasPasskey, pinLocked: data.pinLocked });
        setMode(data.hasPin || data.hasPasskey ? 'unlock' : 'setup');
      } else {
        setMode('setup');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinUnlock = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await unlockWithPin({ pin });
    setBusy(false);
    if (result?.data?.success) {
      onUnlocked();
    } else {
      const msg = result?.serverError || 'PIN incorrecto';
      setError(msg);
      if (msg.includes('bloqueado')) setStatus((prev) => (prev ? { ...prev, pinLocked: true } : prev));
    }
  }, [pin, onUnlocked]);

  const handlePasskeyUnlock = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await runPasskeyAuthentication();
      const result = await unlockWithPasskey();
      if (result?.data?.success) {
        onUnlocked();
        return;
      }
      setError(result?.serverError || 'No se pudo desbloquear con passkey');
    } catch (err) {
      if (!isPasskeyCancellation(err)) {
        setError(err instanceof Error ? err.message : 'No se pudo verificar la passkey');
      }
    } finally {
      setBusy(false);
    }
  }, [onUnlocked]);

  const handleSetup = useCallback(async () => {
    if (pin !== confirmPin) {
      setError('Los PIN no coinciden');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await setSecurityPinAction({ pin });
    if (result?.data?.success) {
      const unlock = await unlockWithPin({ pin });
      setBusy(false);
      if (unlock?.data?.success) {
        showAlert.toast.success('PIN de seguridad configurado');
        onUnlocked();
        return;
      }
      setMode('unlock');
      setStatus({ hasPin: true, hasPasskey: false, pinLocked: false });
      setPin('');
      setConfirmPin('');
      return;
    }
    setBusy(false);
    setError(result?.serverError || result?.validationErrors?._errors?.[0] || 'No se pudo configurar el PIN');
  }, [pin, confirmPin, onUnlocked]);

  const handleRequestReset = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await requestPinResetAction();
    setBusy(false);
    if (result?.data?.success) {
      showAlert.toast.success('Código enviado a tu email');
      setMode('reset_confirm');
    } else {
      setError(result?.serverError || 'No se pudo enviar el código');
    }
  }, []);

  const handleConfirmReset = useCallback(async () => {
    if (pin !== confirmPin) {
      setError('Los PIN no coinciden');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await confirmPinResetAction({ otp, newPin: pin });
    if (result?.data?.success) {
      const unlock = await unlockWithPin({ pin });
      setBusy(false);
      if (unlock?.data?.success) {
        showAlert.toast.success('PIN restablecido');
        onUnlocked();
        return;
      }
      setMode('unlock');
      setStatus({ hasPin: true, hasPasskey: false, pinLocked: false });
      setPin('');
      setConfirmPin('');
      setOtp('');
      return;
    }
    setBusy(false);
    setError(result?.serverError || result?.validationErrors?._errors?.[0] || 'Código inválido');
  }, [otp, pin, confirmPin, onUnlocked]);

  const showPasskey = Boolean(status?.hasPasskey) && webAuthnSupported;
  const showPin = Boolean(status?.hasPin) && !status?.pinLocked;
  const pinValid = /^\d{4,6}$/.test(pin);

  return (
    <div className="border-border bg-card/50 flex flex-col justify-center gap-2 rounded-xl p-3 backdrop-blur-sm md:items-center md:gap-3 md:p-5 md:text-center">
      <div className="mx-auto flex w-full max-w-xs flex-col items-center justify-center gap-1.5 text-center md:gap-2.5">
        <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-12 md:w-12">
          {mode === 'setup' ? (
            <ShieldCheck className="text-primary h-4 w-4 md:h-6 md:w-6" />
          ) : (
            <Lock className="text-primary h-4 w-4 md:h-6 md:w-6" />
          )}
        </div>

        <div className="min-w-0 space-y-0">
          <h3 className="text-xs font-bold md:text-base">{title}</h3>
          <p className="text-muted-foreground hidden text-xs leading-snug md:block md:max-w-xs">{description}</p>
        </div>
      </div>

      {mode === 'loading' && <Spinner size="sm" className="text-muted-foreground" />}

      {mode === 'unlock' && (
        <div className="mx-auto flex w-full max-w-xs flex-col gap-2 md:gap-2.5">
          {showPasskey && (
            <Button onClick={handlePasskeyUnlock} disabled={busy} className="gap-2">
              {busy ? <Spinner size="sm" /> : <Fingerprint className="h-4 w-4" />}
              Desbloquear con passkey
            </Button>
          )}

          {showPin && (
            <>
              {showPasskey && <span className="text-muted-foreground text-center text-xs">o usá tu PIN de seguridad</span>}
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                placeholder="PIN (4-6 dígitos)"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pinValid && !busy) void handlePinUnlock();
                }}
                className="text-center font-mono text-sm tracking-[0.5em] md:text-base"
              />
              <Button variant={showPasskey ? 'outline' : 'default'} onClick={handlePinUnlock} disabled={busy || !pinValid}>
                {busy && !showPasskey ? <Spinner size="sm" /> : null}
                Desbloquear
              </Button>
            </>
          )}

          {status?.pinLocked && (
            <p className="text-destructive text-center text-xs font-medium">
              Tu PIN está bloqueado por intentos fallidos. Restablecelo por email.
            </p>
          )}

          {status?.hasPin && (
            <button
              type="button"
              onClick={() => {
                setMode('reset_request');
                setError(null);
              }}
              className="text-muted-foreground hover:text-primary text-xs underline underline-offset-2"
            >
              Olvidé mi PIN
            </button>
          )}
        </div>
      )}

      {mode === 'setup' && (
        <div className="mx-auto flex w-full max-w-xs flex-col gap-2 md:gap-2.5">
          <p className="text-muted-foreground text-center text-[11px] leading-snug md:text-xs">
            Creá un PIN para proteger tus compras. Te lo pediremos antes de mostrar códigos.
          </p>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="Nuevo PIN (4-6 dígitos)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-sm tracking-[0.5em] md:text-base"
          />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="Confirmar PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-sm tracking-[0.5em] md:text-base"
          />
          <Button onClick={handleSetup} disabled={busy || !pinValid || confirmPin.length !== pin.length}>
            {busy ? <Spinner size="sm" /> : null}
            Crear PIN
          </Button>
        </div>
      )}

      {mode === 'reset_request' && (
        <div className="mx-auto flex w-full max-w-xs flex-col gap-2 md:gap-2.5">
          <p className="text-muted-foreground text-center text-[11px] leading-snug md:text-xs">
            Te enviaremos un código al email para restablecer el PIN.
          </p>
          <Button onClick={handleRequestReset} disabled={busy} className="gap-2">
            {busy ? <Spinner size="sm" /> : <Mail className="h-4 w-4" />}
            Enviar código
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode('unlock');
              setError(null);
            }}
            className="text-muted-foreground hover:text-primary text-xs underline underline-offset-2"
          >
            Volver
          </button>
        </div>
      )}

      {mode === 'reset_confirm' && (
        <div className="mx-auto flex w-full max-w-xs flex-col gap-2 md:gap-2.5">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Código del email"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-sm tracking-[0.5em] md:text-base"
          />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="Nuevo PIN (4-6 dígitos)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-sm tracking-[0.5em] md:text-base"
          />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="Confirmar nuevo PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-sm tracking-[0.5em] md:text-base"
          />
          <Button onClick={handleConfirmReset} disabled={busy || otp.length !== 6 || !pinValid || confirmPin.length !== pin.length}>
            {busy ? <Spinner size="sm" /> : null}
            Restablecer PIN
          </Button>
          <button
            type="button"
            onClick={handleRequestReset}
            disabled={busy}
            className="text-muted-foreground hover:text-primary text-xs underline underline-offset-2"
          >
            Reenviar código
          </button>
        </div>
      )}

      {error && <p className="text-destructive text-center text-xs font-medium">{error}</p>}
    </div>
  );
}
