'use client';

import { MouseEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showAlert } from '@/lib/ui';
import { reportClientError } from '@/lib/utils';
import { cancelOrder as cancelOrderAdmin } from '@/actions/admin/orders';
import { cancelOrder as cancelOrderBuyer } from '@/actions/buyer/orders';
import { deleteBatch, cancelBatch } from '@/actions/admin/batches';

export function useCancelOrderAction(queryKeys: string[], scope: 'admin' | 'buyer') {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  // La action admin es adminActionClient (rol ADMIN únicamente) — un buyer que
  // la invoca recibe unauthorized() y el cancel falla SIEMPRE. Cada scope debe
  // usar su action: la de buyer valida ownership (findOrderForUser).
  const cancelOrderAction = scope === 'admin' ? cancelOrderAdmin : cancelOrderBuyer;
  const cancel = async (orderId: string, e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('¿Seguro que quieres cancelar esta orden?', 'Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      const result = await cancelOrderAction({ orderId });
      if (result.serverError || result.validationErrors) {
        showAlert.error(result.serverError || 'Error al cancelar la orden');
      } else {
        showAlert.toast.success('Orden cancelada con éxito');
        // Feedback vía React Query — NUNCA router.refresh() (aborta navs en vuelo)
        for (const key of queryKeys) void queryClient.invalidateQueries({ queryKey: [key] });
      }
    } catch (error) {
      // Fallo de transporte (action stale tras redeploy, red caída): la request
      // nunca ejecutó la action — reportar a app_log o el fallo es invisible.
      console.error(error);
      reportClientError(error instanceof Error ? error : new Error(String(error)), 'cancel-order');
      showAlert.error('Error al cancelar');
    } finally {
      setIsCancelling(false);
    }
  };
  return { cancel, isCancelling };
}

export function useDeleteBatchAction() {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = async (batchId: number, onDeleted: () => void, e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('Eliminar lote', `¿Eliminar lote #${batchId}?`);
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const result = await deleteBatch({ batchId });
      if (result.serverError) {
        showAlert.error('Error', result.serverError);
      } else {
        showAlert.toast.success('Lote eliminado');
        onDeleted();
      }
    } catch (error) {
      console.error(error);
      reportClientError(error instanceof Error ? error : new Error(String(error)), 'delete-batch');
      showAlert.error('Error', 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };
  return { remove, isDeleting };
}

export function useCancelBatchAction(queryKeys: string[]) {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const cancel = async (batchId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm(
      '¿Cancelar lote?',
      'El lote se marcará como cancelado. El seller será notificado. Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      const result = await cancelBatch({ batchId });
      if (result.serverError || result.validationErrors) {
        showAlert.error(result.serverError || 'Error al cancelar el lote');
      } else {
        showAlert.toast.success('Lote cancelado con éxito');
        // Feedback vía React Query — NUNCA router.refresh() (aborta navs en vuelo)
        for (const key of queryKeys) void queryClient.invalidateQueries({ queryKey: [key] });
      }
    } catch (error) {
      console.error(error);
      reportClientError(error instanceof Error ? error : new Error(String(error)), 'cancel-batch');
      showAlert.error('Error al cancelar');
    } finally {
      setIsCancelling(false);
    }
  };
  return { cancel, isCancelling };
}
