'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
import { showAlert } from '@/lib/ui';
import { useLocale } from '@/hooks/use-locale';
import { getDeviceName, isPasskeyCancellation } from '@/components/auth/passkey/passkey-utils';

/**
 * Gestión de passkeys: listar, agregar y eliminar.
 * La lista se auto-refresca via `$listPasskeys` (atomListeners del plugin)
 * tras registrar o eliminar — no requiere refetch manual.
 */
export const PasskeysSection = () => {
  const { isSpanish } = useLocale();
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const { error } = await authClient.passkey.addPasskey({ name: getDeviceName(isSpanish) });
      if (!error) return;
      if (isPasskeyCancellation(error)) return;
      if ('code' in error && error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
        showAlert.info(
          isSpanish ? 'Passkey ya registrada' : 'Passkey already registered',
          isSpanish ? 'Este dispositivo ya tiene una passkey en tu cuenta.' : 'This device already has a passkey on your account.',
        );
        return;
      }
      showAlert.error(
        'Error',
        (typeof error.message === 'string' ? error.message : undefined) ||
          (isSpanish ? 'No se pudo registrar la passkey' : 'Failed to register passkey'),
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string | null | undefined) => {
    const confirmed = await showAlert.confirm(
      isSpanish ? 'Eliminar passkey' : 'Delete passkey',
      isSpanish
        ? `¿Eliminar "${name || 'passkey'}"? Ya no podrás iniciar sesión con ella.`
        : `Delete "${name || 'passkey'}"? You won't be able to sign in with it anymore.`,
      {
        confirmText: isSpanish ? 'Eliminar' : 'Delete',
        cancelText: isSpanish ? 'Cancelar' : 'Cancel',
        danger: true,
      },
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const { error } = await (authClient as any).passkey.deletePasskey({ id }) as { error: unknown };
      if (error) {
        showAlert.error(
          'Error',
          (error as { message?: string }).message || (isSpanish ? 'No se pudo eliminar la passkey' : 'Failed to delete passkey'),
        );
        return;
      }
      // Sin router.refresh(): la lista se auto-refresca via $listPasskeys
      // (atomListeners) y ningún elemento server-rendered depende del count.
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-md md:h-9 md:w-9">
            <KeyRound className="text-muted-foreground h-3.5 w-3.5 md:h-4 md:w-4" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg">Passkeys</CardTitle>
            <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
              {isSpanish ? 'Inicia sesión con huella o rostro' : 'Sign in with fingerprint or face'}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="h-7 rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-8"
          onClick={() => void handleAdd()}
          disabled={isAdding}
        >
          {isAdding ? <Spinner size="sm" className="text-white" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
          {isSpanish ? 'Agregar' : 'Add'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {isPending ? (
          <div className="flex justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : passkeys && passkeys.length > 0 ? (
          <div className="divide-border divide-y">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium md:text-sm">{passkey.name || 'Passkey'}</p>
                  <p className="text-muted-foreground text-[10px] md:text-xs">
                    {passkey.deviceType === 'multiDevice'
                      ? isSpanish
                        ? 'Sincronizada entre dispositivos'
                        : 'Synced across devices'
                      : isSpanish
                        ? 'Solo este dispositivo'
                        : 'This device only'}
                    {passkey.createdAt &&
                      ` · ${new Date(passkey.createdAt).toLocaleDateString(isSpanish ? 'es' : 'en', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 shrink-0 rounded-md px-2"
                  onClick={() => void handleDelete(passkey.id, passkey.name)}
                  disabled={deletingId === passkey.id}
                  aria-label={isSpanish ? 'Eliminar passkey' : 'Delete passkey'}
                >
                  {deletingId === passkey.id ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs md:text-sm">
            {isSpanish ? 'No tienes passkeys registradas.' : 'No passkeys registered yet.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
