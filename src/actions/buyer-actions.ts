"use server";

import { findGiftcardCombination } from "@/lib/browse-giftcards";
import prisma from "@/lib/prisma";
import { GiftcardIssueType, Prisma } from "@/generated/prisma/client";
import { decrypt } from "@/lib/encryption";
import { authorizeByRequiredRole } from "@/lib/authorization";
import { ActionError, buyerActionClient } from "@/lib/safe-action";
import z from "zod";
import { BuyGiftcardItem } from "@/types";

const searchGiftcardSchema = z.object({ brandId: z.string(), countryId: z.string(), amount: z.number() });

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount } }): Promise<BuyGiftcardItem[]> => {
    const giftcards = await prisma.giftcard.findMany({
      where: {
        brandId,
        countryId,
        inStock: true,
        status: "UNUSED",
      },
    });
    const selectedGiftcards = findGiftcardCombination(giftcards, amount);
    return selectedGiftcards.selectedCards.map((card) => ({
      id: card.id,
      brand: card.brandId,
      amount: card.amount.toNumber(),
      status: "UNUSED",
    }));
  });

/**
 * Returns giftcards WITH claimCode and pinCode for a given order.
 * Only callable by the order's owner — used to reveal codes after order creation.
 */
export const getOrderCards = buyerActionClient
  .inputSchema(z.object({ orderId: z.string() }))
  .action(async ({ parsedInput: { orderId } }): Promise<BuyGiftcardItem[]> => {
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
    return order.giftcards.map((card) => {
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
    });
  });

const reportGiftcardIssueSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().optional(),
  proofImageUrl: z.string().optional(),
});

/**
 * Reports an issue for a specific giftcard within an order.
 * Updates the giftcard status and creates a GiftcardIssue record.
 */
export const reportGiftcardIssue = buyerActionClient
  .inputSchema(reportGiftcardIssueSchema)
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
      success: true,
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

/**
 * Removes a previously reported issue and resets the giftcard back to UNUSED.
 */
export const undoGiftcardIssue = buyerActionClient
  .inputSchema(z.object({ giftcardId: z.string(), orderId: z.string() }))
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
    return {
      success: true,
    };
  });
