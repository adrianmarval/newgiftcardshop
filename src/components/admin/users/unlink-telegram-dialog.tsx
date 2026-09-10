'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import { unlinkTelegram } from '@/actions/admin/users';
import type { User } from '@/types';

interface UnlinkTelegramDialogProps {
  user: User | null;
  onClose: () => void;
  /** Invalidar la lista de usuarios tras desvincular. */
  onChanged: () => void;
}

export function UnlinkTelegramDialog({ user: unlinkTarget, onClose, onChanged }: UnlinkTelegramDialogProps) {
  const { execute: executeUnlink, status: unlinkStatus } = useAction(unlinkTelegram, {
    onSuccess: () => {
      showAlert.toast.success('Telegram desvinculado');
      onChanged();
      onClose();
    },
    onError: (e) => showAlert.toast.error('Error desvinculando: ' + (e.error?.serverError || 'Unknown error')),
  });

  return (
    <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desvincular Telegram</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará la vinculación con Telegram{unlinkTarget?.telegramUser?.username ? ` (@${unlinkTarget.telegramUser.username})` : ''}. El usuario no podrá usar el bot hasta que vuelva a vincular.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (unlinkTarget) executeUnlink({ userId: unlinkTarget.id });
            }}
            disabled={unlinkStatus === 'executing'}
          >
            {unlinkStatus === 'executing' ? 'Desvinculando...' : 'Desvincular'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
