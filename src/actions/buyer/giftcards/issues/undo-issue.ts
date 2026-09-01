'use server';

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { undoIssueInputSchema, undoIssueOutputSchema } from './schemas';

export const undoIssue = buyerActionClient
  .inputSchema(undoIssueInputSchema)
  .outputSchema(undoIssueOutputSchema)
  .useValidated(async ({ parsedInput: { giftcardId, orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No autorizado');
    if (order.status !== 'PENDING') throw new ActionError('No se pueden modificar reportes en una orden que ya fue confirmada');
    const foundGiftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!foundGiftcard) throw new ActionError('Giftcard not found');
    return next({ ctx: { foundGiftcard } });
  })
  .action(async ({ parsedInput: { giftcardId, orderId }, ctx }) => {
    await prisma.$transaction(async (tx) => {
      // Guard atómico DENTRO de la tx (mismo patrón que deleteGiftcardIssue):
      // lockea la fila de la orden y re-valida status — sin esto, un confirm
      // cross-canal entre el useValidated y esta tx dejaba la card volviendo a
      // UNUSED con isConfirmed=true, inflando el payout del seller.
      try {
        await tx.order.update({
          where: { id: orderId, status: 'PENDING' },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new ActionError('No se pueden modificar reportes en una orden que ya fue confirmada');
        }
        throw err;
      }

      const deleted = await tx.giftcardIssue.deleteMany({
        where: { giftcardId, orderId, reportedById: ctx.auth.user.id },
      });

      if (deleted.count === 0) {
        throw new ActionError('No se encontró ningún problema para deshacer en esta tarjeta');
      }

      const remainingIssues = await tx.giftcardIssue.findFirst({
        where: { giftcardId },
      });

      if (!remainingIssues) {
        await tx.giftcard.update({
          where: { id: giftcardId },
          data: { status: 'UNUSED', reportedAmount: null },
        });
      }
    });

    return { success: true as const };
  });
