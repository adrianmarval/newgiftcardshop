'use server';

import { findGiftcardCombination } from '@/lib/browse-giftcards';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import type { BuyGiftcardItem } from '@/types';
import {
  searchGiftcardSchema,
  searchGiftcardsOutputSchema,
  getOrderCardsInputSchema,
  getOrderCardsOutputSchema,
  reportGiftcardIssueSchema,
  reportGiftcardIssueOutputSchema,
  undoGiftcardIssueInputSchema,
  undoGiftcardIssueOutputSchema,
} from '@/types/giftcard/actions';

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardSchema)
  .outputSchema(searchGiftcardsOutputSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount } }) => {
    const giftcards = await prisma.giftcard.findMany({
      where: {
        brandId,
        countryId,
        inStock: true,
        status: 'UNUSED',
      },
    });
    const selectedGiftcards = findGiftcardCombination(giftcards, amount);
    return {
      success: true as const,
      giftcards: selectedGiftcards.selectedCards.map((card) => ({
        id: card.id,
        brand: card.brandId,
        amount: card.amount.toNumber(),
        status: 'UNUSED' as const,
      })),
    };
  });

export const getOrderCards = buyerActionClient
  .inputSchema(getOrderCardsInputSchema)
  .outputSchema(getOrderCardsOutputSchema)
  .action(async ({ parsedInput: { orderId } }) => {
    const { user } = await authorizeByRequiredRole(['BUYER', 'ADMIN']);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: {
          include: { brand: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== user.id) throw new ActionError('No estás autorizado para ver esta orden');
    return {
      success: true as const,
      giftcards: order.giftcards.map((card) => {
        let claimCode: string;
        try {
          claimCode = decrypt(card.claimCode);
        } catch {
          claimCode = card.claimCode;
        }
        let pinCode: string | undefined;
        if (card.pinCode) {
          try {
            pinCode = decrypt(card.pinCode);
          } catch {
            pinCode = card.pinCode;
          }
        }
        return {
          id: card.id,
          brand: card.brandId,
          amount: card.amount.toNumber(),
          claimCode,
          pinCode,
          status: (card.status as BuyGiftcardItem['status']) ?? 'UNUSED',
          reportedAmount: card.reportedAmount ? card.reportedAmount.toNumber() : undefined,
        };
      }),
    };
  });

export const reportGiftcardIssue = buyerActionClient
  .inputSchema(reportGiftcardIssueSchema)
  .outputSchema(reportGiftcardIssueOutputSchema)
  .useValidated(async ({ parsedInput: { issueType, reportedAmount, orderId, giftcardId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No autorizado');
    if (issueType === 'WRONG_AMOUNT' && !reportedAmount) {
      throw new ActionError('El monto reportado es obligatorio para el tipo de problema MONTO_INCORRECTO');
    }
    // Idempotency: prevent duplicate issue reports for the same card/order/user
    const existingIssue = await prisma.giftcardIssue.findFirst({
      where: { giftcardId, orderId, reportedById: ctx.auth.user.id },
    });
    if (existingIssue) throw new ActionError('Ya has reportado un problema con esta tarjeta en esta orden');
    const foundGiftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!foundGiftcard) throw new ActionError('Giftcard not found');
    return next({ ctx: { foundGiftcard } });
  })
  .action(async ({ parsedInput: { giftcardId, orderId, issueType, reportedAmount, proofImageUrl }, ctx }) => {
    const [issue] = await prisma.$transaction([
      prisma.giftcardIssue.create({
        data: {
          issueType,
          reportedAmount: reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
          proofImageUrl: proofImageUrl,
          giftcardId: giftcardId,
          orderId: orderId,
          reportedById: ctx.auth.user.id,
          sellerId: ctx.foundGiftcard.ownerId ?? undefined,
        },
      }),
      prisma.giftcard.update({
        where: { id: giftcardId },
        data: {
          status: issueType,
          reportedAmount: issueType === 'WRONG_AMOUNT' && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
        },
      }),
    ]);
    return {
      success: true as const,
      issue: {
        id: issue.id,
        issueType: issue.issueType,
        reportedAmount: issue.reportedAmount ? issue.reportedAmount.toNumber() : null,
        proofImageUrl: issue.proofImageUrl,
        giftcardId: issue.giftcardId,
        orderId: issue.orderId,
        reportedById: issue.reportedById,
        sellerId: issue.sellerId,
        createdAt: issue.createdAt.toISOString(),
      },
    };
  });

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
    // Only delete issues reported by this user (not other users' issues)
    const deleted = await prisma.giftcardIssue.deleteMany({
      where: { giftcardId, orderId, reportedById: ctx.auth.user.id },
    });

    // If no issues were deleted, the user might be trying to undo an issue they didn't create
    if (deleted.count === 0) {
      throw new ActionError('No se encontró ningún problema para deshacer en esta tarjeta');
    }
    return next({ ctx: { foundGiftcard } });
  })
  .action(async ({ parsedInput: { giftcardId, orderId }, ctx }) => {
    // Only reset card status to UNUSED if no other issues remain on this card
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
