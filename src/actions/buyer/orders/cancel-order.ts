'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ActionError, buyerActionClient } from '@/lib/safe-action';

const cancelOrderInputSchema = z.object({ orderId: z.string() });

export const cancelOrder = buyerActionClient
  .inputSchema(cancelOrderInputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError('Orden no encontrada en la base de datos');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No autorizado');

    const hasActiveCards = order.giftcards.some((g) => {
      if (g.status === 'UNUSED' || g.status === 'USED') return true;
      if (g.status === 'WRONG_AMOUNT' && g.reportedAmount && g.reportedAmount.toNumber() > 0) return true;
      return false;
    });

    if (hasActiveCards) {
      throw new ActionError(
        'No se puede cancelar: la orden contiene tarjetas activas con valor. Espera a que se complete o contacta al soporte.',
      );
    }

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    await prisma.order.update({
      where: { id: ctx.order.id },
      data: {
        status: 'CANCELLED',
        giftcards: {
          updateMany: {
            where: {
              id: { in: ctx.order.giftcards.map((g) => g.id) },
            },
            data: { isConfirmed: true },
          },
        },
      },
    });
    return { success: true as const, message: '¡Orden cancelada con éxito!' };
  });
