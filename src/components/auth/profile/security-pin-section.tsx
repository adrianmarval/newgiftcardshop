'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, Mail } from 'lucide-react';
import { showSwal } from '@/lib/ui';
import { useLocale } from '@/hooks/use-locale';
import {
  getSecurityStatusAction,
  setSecurityPinAction,
  changeSecurityPinAction,
  requestPinResetAction,
  confirmPinResetAction,
} from '@/actions/buyer/security';

type PinMode = 'view' | 'setup' | 'change' | 'reset';

/**
 * Gestión del PIN de seguridad que protege la revelación de códigos de compra.
 * Solo aplica al portal buyer. Recuperación via OTP por email.
 */
export const SecurityPinSection = () => {
  const { isSpanish } = useLocale();
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [pinLocked, setPinLocked] = useState(false);
  const [mode, setMode] = useState<PinMode>('view');
  const [busy, setBusy] = useState(false);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    getSecurityStatusAction().then((result) => {
      if (result?.data?.success) {
        setHasPin(result.data.hasPin);
        setPinLocked(result.data.pinLocked);
      }
      setLoading(false);
    });
  }, []);

  const resetFields = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setOtp('');
  };

  const showError = (text: string) => showSwal.fire({ icon: 'error', title: 'Error', text });
  const showOk = (title: string, text: string) => showSwal.fire({ icon: 'success', title, text });

  const handleSetup = async () => {
    if (newPin !== confirmPin) return showError(isSpanish ? 'Los PIN no coinciden' : 'PINs do not match');
    setBusy(true);
    const result = await setSecurityPinAction({ pin: newPin });
    setBusy(false);
    if (result?.data?.success) {
      setHasPin(true);
      setMode('view');
      resetFields();
      showOk(isSpanish ? 'PIN configurado' : 'PIN set', isSpanish ? 'Tu PIN de seguridad ya protege tus códigos.' : 'Your security PIN now protects your codes.');
    } else {
      showError(result?.serverError || result?.validationErrors?._errors?.[0] || (isSpanish ? 'No se pudo configurar el PIN' : 'Failed to set PIN'));
    }
  };

  const handleChange = async () => {
    if (newPin !== confirmPin) return showError(isSpanish ? 'Los PIN no coinciden' : 'PINs do not match');
    setBusy(true);
    const result = await changeSecurityPinAction({ currentPin, newPin });
    setBusy(false);
    if (result?.data?.success) {
      setMode('view');
      resetFields();
      showOk(isSpanish ? 'PIN actualizado' : 'PIN updated', isSpanish ? 'Tu PIN de seguridad fue actualizado.' : 'Your security PIN was updated.');
    } else {
      showError(result?.serverError || result?.validationErrors?._errors?.[0] || (isSpanish ? 'No se pudo actualizar el PIN' : 'Failed to update PIN'));
    }
  };

  const handleRequestReset = async () => {
    setBusy(true);
    const result = await requestPinResetAction();
    setBusy(false);
    if (result?.data?.success) {
      showOk(isSpanish ? 'Código enviado' : 'Code sent', isSpanish ? 'Revisá tu email para obtener el código de 6 dígitos.' : 'Check your email for the 6-digit code.');
    } else {
      showError(result?.serverError || (isSpanish ? 'No se pudo enviar el código' : 'Failed to send code'));
    }
  };

  const handleConfirmReset = async () => {
    if (newPin !== confirmPin) return showError(isSpanish ? 'Los PIN no coinciden' : 'PINs do not match');
    setBusy(true);
    const result = await confirmPinResetAction({ otp, newPin });
    setBusy(false);
    if (result?.data?.success) {
      setHasPin(true);
      setPinLocked(false);
      setMode('view');
      resetFields();
      showOk(isSpanish ? 'PIN restablecido' : 'PIN reset', isSpanish ? 'Tu nuevo PIN ya está activo.' : 'Your new PIN is now active.');
    } else {
      showError(result?.serverError || result?.validationErrors?._errors?.[0] || (isSpanish ? 'Código inválido' : 'Invalid code'));
    }
  };

  const pinValid = /^\d{4,6}$/.test(newPin);
  const pinInput = (value: string, setter: (v: string) => void, placeholder: string, key: string) => (
    <Input
      key={key}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setter(e.target.value.replace(/\D/g, ''))}
      className="text-center font-mono tracking-[0.4em]"
    />
  );

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-md md:h-9 md:w-9">
            <ShieldCheck className="text-muted-foreground h-3.5 w-3.5 md:h-4 md:w-4" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg">{isSpanish ? 'PIN de seguridad' : 'Security PIN'}</CardTitle>
            <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
              {isSpanish ? 'Protege los códigos de tus compras' : 'Protects your purchase codes'}
            </p>
          </div>
        </div>

        {mode === 'view' && !loading && (
          <div className="flex items-center gap-1">
            {hasPin && !pinLocked && (
              <Button size="sm" variant="outline" className="h-7 rounded-md text-xs font-semibold md:h-8" onClick={() => { resetFields(); setMode('change'); }}>
                {isSpanish ? 'Cambiar' : 'Change'}
              </Button>
            )}
            {hasPin && (
              <Button size="sm" variant="ghost" className="h-7 rounded-md text-xs font-semibold md:h-8" onClick={() => { resetFields(); setMode('reset'); }}>
                {isSpanish ? 'Olvidé mi PIN' : 'Forgot PIN'}
              </Button>
            )}
            {!hasPin && (
              <Button size="sm" className="h-7 rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-8" onClick={() => { resetFields(); setMode('setup'); }}>
                {isSpanish ? 'Configurar' : 'Set up'}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {loading ? (
          <div className="flex justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : mode === 'view' ? (
          <p className="text-muted-foreground text-xs md:text-sm">
            {pinLocked
              ? isSpanish
                ? 'Tu PIN está bloqueado por intentos fallidos. Restablecelo con un código por email.'
                : 'Your PIN is locked after failed attempts. Reset it with an email code.'
              : hasPin
                ? isSpanish
                  ? 'PIN configurado. Se solicitará al revelar códigos de órdenes nuevas.'
                  : 'PIN set. It will be requested when revealing codes of new orders.'
                : isSpanish
                  ? 'Sin PIN. Se te pedirá crear uno antes de revelar códigos.'
                  : 'No PIN set. You will be asked to create one before revealing codes.'}
          </p>
        ) : mode === 'setup' ? (
          <div className="space-y-2">
            {pinInput(newPin, setNewPin, isSpanish ? 'Nuevo PIN (4-6 dígitos)' : 'New PIN (4-6 digits)', 'new')}
            {pinInput(confirmPin, setConfirmPin, isSpanish ? 'Confirmar PIN' : 'Confirm PIN', 'confirm')}
            <div className="flex gap-1">
              <Button size="sm" onClick={handleSetup} disabled={busy || !pinValid || confirmPin !== newPin} className="flex-1">
                {busy && <Spinner size="sm" className="mr-1" />}
                {isSpanish ? 'Guardar PIN' : 'Save PIN'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('view')} disabled={busy}>
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </Button>
            </div>
          </div>
        ) : mode === 'change' ? (
          <div className="space-y-2">
            {pinInput(currentPin, setCurrentPin, isSpanish ? 'PIN actual' : 'Current PIN', 'current')}
            {pinInput(newPin, setNewPin, isSpanish ? 'Nuevo PIN (4-6 dígitos)' : 'New PIN (4-6 digits)', 'new')}
            {pinInput(confirmPin, setConfirmPin, isSpanish ? 'Confirmar nuevo PIN' : 'Confirm new PIN', 'confirm')}
            <div className="flex gap-1">
              <Button size="sm" onClick={handleChange} disabled={busy || !/^\d{4,6}$/.test(currentPin) || !pinValid || confirmPin !== newPin} className="flex-1">
                {busy && <Spinner size="sm" className="mr-1" />}
                {isSpanish ? 'Actualizar PIN' : 'Update PIN'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('view')} disabled={busy}>
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              {isSpanish ? 'Te enviaremos un código de 6 dígitos a tu email para restablecer el PIN.' : 'We will send a 6-digit code to your email to reset the PIN.'}
            </p>
            <Button size="sm" variant="outline" onClick={handleRequestReset} disabled={busy} className="gap-1">
              {busy ? <Spinner size="sm" /> : <Mail className="h-3.5 w-3.5" />}
              {isSpanish ? 'Enviar código' : 'Send code'}
            </Button>
            {pinInput(otp, setOtp, isSpanish ? 'Código del email' : 'Email code', 'otp')}
            {pinInput(newPin, setNewPin, isSpanish ? 'Nuevo PIN (4-6 dígitos)' : 'New PIN (4-6 digits)', 'new')}
            {pinInput(confirmPin, setConfirmPin, isSpanish ? 'Confirmar nuevo PIN' : 'Confirm new PIN', 'confirm')}
            <div className="flex gap-1">
              <Button size="sm" onClick={handleConfirmReset} disabled={busy || otp.length !== 6 || !pinValid || confirmPin !== newPin} className="flex-1">
                {busy && <Spinner size="sm" className="mr-1" />}
                {isSpanish ? 'Restablecer PIN' : 'Reset PIN'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('view')} disabled={busy}>
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
