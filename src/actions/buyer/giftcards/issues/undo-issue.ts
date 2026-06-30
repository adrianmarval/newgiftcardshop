'use server';

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