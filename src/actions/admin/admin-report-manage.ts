'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { adminReportManageInputSchema, adminReportManageOutputSchema } from '@/types/domain/admin';

export const adminReportManage = adminActionClient
  .inputSchema(adminReportManageInputSchema)
  .outputSchema(adminReportManageOutputSchema)
  .useValidated(async ({ parsedInput: { action, giftcardId, orderId, issueType, reportedAmount }, next }) => {
    if (action === 'ADD') {
      if (!issueType) throw new ActionError('El tipo de issue es requerido para agregar');
      if (issueType === 'WRONG_AMOUNT' && !reportedAmount) {
        throw new ActionError('El monto reportado es requerido para WRONG_AMOUNT');
      }
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
      const [issue] = await prisma.$transaction([
        prisma.giftcardIssue.create({
          data: {
            issueType: issueType!,
            reportedAmount: issueType === 'WRONG_AMOUNT' && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
            giftcardId,
            orderId,
            reportedById: ctx.order.userId,
            sellerId: ctx.giftcard.ownerId ?? undefined,
          },
        }),
        prisma.giftcard.update({
          where: { id: giftcardId },
          data: {
            status: issueType!,
            reportedAmount: issueType === 'WRONG_AMOUNT' && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
          },
        }),
      ]);
      return { success: true as const };
    }

    if (action === 'UPDATE') {
      await prisma.$transaction([
        prisma.giftcardIssue.updateMany({
          where: { giftcardId, orderId },
          data: { reportedAmount: new Prisma.Decimal(reportedAmount!) },
        }),
        prisma.giftcard.update({
          where: { id: giftcardId },
          data: { reportedAmount: new Prisma.Decimal(reportedAmount!) },
        }),
      ]);
      return { success: true as const };
    }

    if (action === 'DELETE') {
      const remainingIssues = await prisma.giftcardIssue.findFirst({
        where: { giftcardId },
      });

      await prisma.$transaction([
        prisma.giftcardIssue.deleteMany({
          where: { giftcardId, orderId },
        }),
        prisma.giftcard.update({
          where: { id: giftcardId },
          data: remainingIssues ? {} : { status: 'UNUSED', reportedAmount: null },
        }),
      ]);
      return { success: true as const };
    }

    throw new ActionError('Acción no válida');
  });
