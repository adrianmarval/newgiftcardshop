'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { undoGiftcardIssueInputSchema, undoGiftcardIssueOutputSchema } from '@/types/application/buy-flow';

export const undoGiftcardIssue = buyerActionClient
  .inputSchema(undoGiftcardIssueInputSchema)
  .outputSchema(undoGiftcardIssueOutputSchema)
  .useValidated(async ({ parsedInput: { giftcardId, orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No autorizado');
    const foundGiftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!foundGiftcard) throw new ActionError('Giftcard not found');
    const deleted = await prisma.giftcardIssue.deleteMany({
      where: { giftcardId, orderId, reportedById: ctx.auth.user.id },
    });

    if (deleted.count === 0) {
      throw new ActionError('No se encontró ningún problema para deshacer en esta tarjeta');
    }
    return next({ ctx: { foundGiftcard } });
  })
  .action(async ({ parsedInput: { giftcardId, orderId }, ctx }) => {
    const remainingIssues = await prisma.giftcardIssue.findFirst({
      where: { giftcardId },
    });

    if (!remainingIssues) {
      await prisma.giftcard.update({
        where: { id: giftcardId },
        data: { status: 'UNUSED', reportedAmount: null },
      });
    }

    return { success: true as const };
  });
