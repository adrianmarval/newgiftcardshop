'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/hooks/use-locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Lock, MonitorSmartphone, LogOut } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { updateProfile } from '@/actions/auth/update-profile';
import { getActiveSessions } from '@/actions/auth/get-active-sessions';
import { revokeOtherSessions } from '@/actions/auth/revoke-other-sessions';
import { useAction } from 'next-safe-action/hooks';
import { Spinner } from '@/components/ui/spinner';
import { showAlert } from '@/lib/ui';

function parseUserAgent(ua: string | null): { icon: string; label: string } {
  if (!ua) return { icon: '🌐', label: 'Unknown device' };
  if (/android/i.test(ua)) return { icon: '📱', label: 'Android' };
  if (/iphone|ipad|ipod/i.test(ua)) return { icon: '📱', label: /ipad/i.test(ua) ? 'iPad' : 'iPhone' };
  if (/mac/i.test(ua)) return { icon: '🖥️', label: 'Mac' };
  if (/windows/i.test(ua)) return { icon: '🖥️', label: 'Windows' };
  if (/linux/i.test(ua)) return { icon: '🐧', label: 'Linux' };
  if (/bot|crawler|spider/i.test(ua)) return { icon: '🤖', label: 'Bot' };
  return { icon: '🌐', label: 'Unknown device' };
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface SecuritySectionProps {
  isPending?: boolean;
}

const MSG = {
  sell: {
    currentRequired: 'Ingresa tu contraseña actual',
    newRequired: 'Ingresa la nueva contraseña',
    confirmRequired: 'Confirma la nueva contraseña',
    minLength: 'Mínimo 8 caracteres',
    passwordsMismatch: 'Las contraseñas no coinciden',
    passwordUpdated: '¡Contraseña actualizada!',
    updateFailed: 'Error al actualizar contraseña',
    currentIncorrect: 'La contraseña actual es incorrecta',
    hiddenForSecurity: 'Oculto por seguridad',
  },
  buy: {
    currentRequired: 'Ingresa tu contraseña actual',
    newRequired: 'Ingresa la nueva contraseña',
    confirmRequired: 'Confirma la nueva contraseña',
    minLength: 'Mínimo 8 caracteres',
    passwordsMismatch: 'Las contraseñas no coinciden',
    passwordUpdated: '¡Contraseña actualizada!',
    updateFailed: 'Error al actualizar contraseña',
    currentIncorrect: 'La contraseña actual es incorrecta',
    hiddenForSecurity: 'Oculto por seguridad',
  },
  admin: {
    currentRequired: 'Ingresa tu contraseña actual',
    newRequired: 'Ingresa la nueva contraseña',
    confirmRequired: 'Confirma la nueva contraseña',
    minLength: 'Mínimo 8 caracteres',
    passwordsMismatch: 'Las contraseñas no coinciden',
    passwordUpdated: '¡Contraseña actualizada!',
    updateFailed: 'Error al actualizar contraseña',
    currentIncorrect: 'La contraseña actual es incorrecta',
    hiddenForSecurity: 'Oculto por seguridad',
  },
};

const MSG_EN = {
  currentRequired: 'Enter your current password',
  newRequired: 'Enter your new password',
  confirmRequired: 'Confirm your new password',
  minLength: 'At least 8 characters',
  passwordsMismatch: 'Passwords do not match',
  passwordUpdated: 'Password updated!',
  updateFailed: 'Failed to update password',
  currentIncorrect: 'Current password is incorrect',
  hiddenForSecurity: 'Hidden for security',
};

function getMsg(portal: string, key: keyof typeof MSG.sell) {
  return portal === 'sell' ? MSG.sell[key] : MSG_EN[key];
}

export const SecuritySection = ({ isPending = false }: SecuritySectionProps) => {
  const { isSpanish } = useLocale();
  const pathname = usePathname();
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string; description?: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const [sessions, setSessions] = useState<Array<{ id: string; ipAddress: string | null; userAgent: string | null; createdAt: Date; expiresAt: Date }>>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const { execute: executeGetSessions, status: sessionsStatus } = useAction(getActiveSessions, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSessions(data.sessions);
        setSessionsLoaded(true);
      }
    },
  });

  const { execute: executeRevoke, status: revokeStatus } = useAction(revokeOtherSessions, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        showAlert.toast.success(
          isSpanish
            ? `${data.revokedCount} sesiones revocadas`
            : `${data.revokedCount} sessions revoked`
        );
        setSessions((prev) => prev.filter((_, i) => i === 0));
      }
    },
  });

  const portal = pathname.includes('/admin') ? 'admin' : pathname.includes('/sell') ? 'sell' : 'buy';

  const { execute: executeUpdate, status: updateStatus } = useAction(updateProfile, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setAlert({ variant: 'success', title: getMsg(portal, 'passwordUpdated') });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFieldErrors({});
        setTimeout(() => {
          setShowPasswordFields(false);
          setAlert(null);
        }, 2000);
      } else {
        const msg = data?.error || getMsg(portal, 'updateFailed');
        if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong')) {
          setFieldErrors((prev) => ({ ...prev, current: getMsg(portal, 'currentIncorrect') }));
          setAlert({
            variant: 'error',
            title: getMsg(portal, 'currentIncorrect'),
            description: isSpanish ? 'Verifica e intenta de nuevo' : 'Verify and try again',
          });
        } else {
          setAlert({ variant: 'error', title: msg });
        }
      }
    },
    onError: ({ error }) => {
      console.log(error);
      setAlert({ variant: 'error', title: error.serverError || getMsg(portal, 'updateFailed') });
    },
  });

  const isUpdating = updateStatus === 'executing' || isPending;

  useEffect(() => {
    executeGetSessions();
  }, []);

  const handleSubmitPassword = () => {
    const errors: { current?: string; new?: string; confirm?: string } = {};
    setFieldErrors({});
    setAlert(null);

    if (!currentPassword) {
      errors.current = getMsg(portal, 'currentRequired');
    }
    if (!newPassword) {
      errors.new = getMsg(portal, 'newRequired');
    } else if (newPassword.length < 8) {
      errors.new = getMsg(portal, 'minLength');
    }
    if (!confirmPassword) {
      errors.confirm = getMsg(portal, 'confirmRequired');
    } else if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirm = getMsg(portal, 'passwordsMismatch');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    executeUpdate({
      name: '',
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    if (fieldErrors.new) {
      setFieldErrors((prev) => ({ ...prev, new: undefined }));
    }
    if (confirmPassword && value !== confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirm: getMsg(portal, 'passwordsMismatch') }));
    } else if (confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (fieldErrors.confirm) {
      if (value === newPassword || !value) {
        setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
      }
    } else if (value && newPassword && value !== newPassword) {
      setFieldErrors((prev) => ({ ...prev, confirm: getMsg(portal, 'passwordsMismatch') }));
    }
  };

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 md:h-9 md:w-9 md:rounded-lg">
            <Lock className="h-3.5 w-3.5 text-emerald-400 md:h-4 md:w-4" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg">{isSpanish ? 'Seguridad' : 'Security'}</CardTitle>
            <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
              {isSpanish ? 'Gestiona tu contraseña' : 'Manage your password'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-7 rounded-md text-xs font-medium md:h-8 ${
            showPasswordFields ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20' : ''
          }`}
          onClick={() => {
            setShowPasswordFields(!showPasswordFields);
            setAlert(null);
            setFieldErrors({});
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}
        >
          {showPasswordFields ? (isSpanish ? 'Cancelar' : 'Cancel') : isSpanish ? 'Cambiar' : 'Change'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <AnimatePresence>
          {showPasswordFields && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {alert && (
                <InlineAlert
                  variant={alert.variant}
                  title={alert.title}
                  description={alert.description}
                  autoDismiss
                  dismissAfter={4000}
                  onDismiss={() => setAlert(null)}
                />
              )}

              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs font-medium md:text-sm">
                  {isSpanish ? 'Contraseña actual' : 'Current password'}
                </Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isUpdating}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.current) setFieldErrors((prev) => ({ ...prev, current: undefined }));
                  }}
                  className={`h-9 text-sm md:h-10 md:text-base ${fieldErrors.current ? 'border-destructive' : ''}`}
                />
                {fieldErrors.current && <p className="text-destructive text-xs">{fieldErrors.current}</p>}
              </div>

              <div className="grid gap-1 md:grid-cols-2 md:gap-1">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium md:text-sm">
                    {isSpanish ? 'Nueva contraseña' : 'New password'}
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={isUpdating}
                    value={newPassword}
                    onChange={(e) => handleNewPasswordChange(e.target.value)}
                    className={`h-9 md:h-10 ${fieldErrors.new ? 'border-destructive' : ''}`}
                  />
                  {fieldErrors.new && <p className="text-destructive text-xs">{fieldErrors.new}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium md:text-sm">
                    {isSpanish ? 'Confirmar' : 'Confirm'}
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={isUpdating}
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className={`h-9 md:h-10 ${fieldErrors.confirm ? 'border-destructive' : ''}`}
                  />
                  {fieldErrors.confirm && <p className="text-destructive text-xs">{fieldErrors.confirm}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs md:text-sm">{isSpanish ? 'Mínimo 8 caracteres' : 'At least 8 characters'}</p>
                <Button
                  size="sm"
                  onClick={handleSubmitPassword}
                  disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-semibold"
                >
                  {isUpdating ? <Spinner size="sm" className="text-white" /> : isSpanish ? 'Guardar' : 'Save'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showPasswordFields && (
          <div className="flex flex-col gap-3">
            {/* Active Sessions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium md:text-sm">
                    {isSpanish ? 'Sesiones activas' : 'Active sessions'}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">{sessions.length}</span>
              </div>

              {sessionsStatus === 'executing' && sessionsLoaded === false ? (
                <Spinner size="sm" />
              ) : (
                <div className="space-y-1.5">
                  {sessions.map((s, i) => {
                    const isCurrent = i === 0;
                    const device = parseUserAgent(s.userAgent);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
                          isCurrent
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-slate-800 bg-slate-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{device.icon}</span>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-foreground font-medium">{device.label}</span>
                            <span className="text-muted-foreground">
                              {s.ipAddress || '—'} · {formatDate(s.createdAt)}
                            </span>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            {isSpanish ? 'Actual' : 'Current'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {sessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-1.5 text-xs text-destructive hover:text-destructive"
                  disabled={revokeStatus === 'executing'}
                  onClick={() => executeRevoke()}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {revokeStatus === 'executing'
                    ? isSpanish ? 'Revocando...' : 'Revoking...'
                    : isSpanish
                      ? `Cerrar otras sesiones (${sessions.length - 1})`
                      : `Revoke other sessions (${sessions.length - 1})`}
                </Button>
              )}
            </div>

            <LogoutButton
              portal={portal}
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start md:justify-between"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
