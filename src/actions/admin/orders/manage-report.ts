'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { reportGiftcardIssue, deleteGiftcardIssue } from '@/lib/services/order';
import { GiftcardIssueType } from '@/generated/prisma/enums';

const manageReportInputSchema = z.object({
  action: z.enum(['ADD', 'UPDATE', 'DELETE']),
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType).optional(),
  reportedAmount: z.number().optional(),
});
const manageReportOutputSchema = z.object({ success: z.literal(true) });

export const manageReport = adminActionClient
  .inputSchema(manageReportInputSchema)
  .outputSchema(manageReportOutputSchema)
  .useValidated(async ({ parsedInput: { action, giftcardId, orderId, issueType, reportedAmount }, next }) => {
    if (action === 'ADD') {
      if (!issueType) throw new ActionError('El tipo de issue es requerido para agregar');
      if (issueType === 'WRONG_AMOUNT' && !reportedAmount) throw new ActionError('El monto reportado es requerido para WRONG_AMOUNT');
    }
    if (action === 'UPDATE') {
      if (!reportedAmount) throw new ActionError('El monto reportado es requerido para actualizar');
    }

    const giftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { status: true, reportedAmount: true, ownerId: true },
    });
    if (!giftcard) throw new ActionError('Giftcard no encontrado');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });
    if (!order) throw new ActionError('Orden no encontrada');

    return next({ ctx: { giftcard, order } });
  })
  .action(async ({ parsedInput: { action, giftcardId, orderId, issueType, reportedAmount }, ctx }) => {
    if (action === 'ADD') {
      await reportGiftcardIssue({
        giftcardId,
        orderId,
        userId: ctx.order.userId,
        issueType: issueType!,
        reportedAmount,
      });
      return { success: true as const };
    }

    if (action === 'UPDATE') {
      await prisma.$transaction([
        prisma.giftcardIssue.updateMany({ where: { giftcardId, orderId }, data: { reportedAmount: new Prisma.Decimal(reportedAmount!) } }),
        prisma.giftcard.update({ where: { id: giftcardId }, data: { reportedAmount: new Prisma.Decimal(reportedAmount!) } }),
      ]);
      return { success: true as const };
    }

    if (action === 'DELETE') {
      await deleteGiftcardIssue(giftcardId, orderId, ctx.order.userId);
      return { success: true as const };
    }

    throw new ActionError('Acción no válida');
  });
