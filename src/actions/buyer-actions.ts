"use server";

import { findGiftcardCombination } from "@/lib/browse-giftcards";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { decrypt } from "@/lib/encryption";
import { authorizeByRequiredRole } from "@/lib/authorization";
import { ActionError, buyerActionClient } from "@/lib/safe-action";
import type { BuyGiftcardItem } from "@/types";
import {
  searchGiftcardSchema,
  searchGiftcardsOutputSchema,
  getOrderCardsInputSchema,
  getOrderCardsOutputSchema,
  reportGiftcardIssueSchema,
  reportGiftcardIssueOutputSchema,
  undoGiftcardIssueInputSchema,
  undoGiftcardIssueOutputSchema,
} from "@/types/giftcard/actions";

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardSchema)
  .outputSchema(searchGiftcardsOutputSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount } }) => {
    const giftcards = await prisma.giftcard.findMany({
      where: {
        brandId,
        countryId,
        inStock: true,
        status: "UNUSED",
      },
    });
    const selectedGiftcards = findGiftcardCombination(giftcards, amount);
    return {
      success: true as const,
      giftcards: selectedGiftcards.selectedCards.map((card) => ({
        id: card.id,
        brand: card.brandId,
        amount: card.amount.toNumber(),
        status: "UNUSED" as const,
      })),
    };
  });

export const getOrderCards = buyerActionClient
  .inputSchema(getOrderCardsInputSchema)
  .outputSchema(getOrderCardsOutputSchema)
  .action(async ({ parsedInput: { orderId } }) => {
    const { user } = await authorizeByRequiredRole(["BUYER", "ADMIN"]);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: {
          include: { brand: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) throw new ActionError("Order not found");
    if (order.userId !== user.id) throw new ActionError("Not authorized to view this order");
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
          status: (card.status as BuyGiftcardItem["status"]) ?? "UNUSED",
          reportedAmount: card.reportedAmount ? card.reportedAmount.toNumber() : undefined,
          sellerId: card.ownerId ?? undefined,
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
    if (!order) throw new ActionError("Order not found");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("Not authorized");
    if (issueType === "WRONG_AMOUNT" && !reportedAmount) {
      throw new ActionError("Reported amount is required for WRONG_AMOUNT issue type");
    }
    const foundGiftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!foundGiftcard) throw new ActionError("Giftcard not found");
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
          reportedAmount: issueType === "WRONG_AMOUNT" && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
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
    if (!order) throw new ActionError("Order not found");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("Not authorized");
    const foundGiftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!foundGiftcard) throw new ActionError("Giftcard not found");
    return next({ ctx: { foundGiftcard } });
  })
  .action(async ({ parsedInput: { giftcardId, orderId }, ctx }) => {
    await prisma.$transaction([
      prisma.giftcardIssue.deleteMany({
        where: { giftcardId, orderId },
      }),
      prisma.giftcard.update({
        where: { id: giftcardId },
        data: { status: "UNUSED", reportedAmount: null },
      }),
    ]);
    return { success: true as const };
  });
