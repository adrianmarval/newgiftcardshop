"use server";

import { findGiftcardCombination } from "@/lib/browse-giftcards";
import prisma from "@/lib/prisma";
import { BuyGiftcardItem } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { decrypt } from "@/lib/encryption";

/**
 * Searches available gift cards matching the criteria.
 * Does NOT return claimCode — codes are only revealed after the order is created.
 */
export async function searchGiftcards(brandId: string, countryId: string, amount: number): Promise<BuyGiftcardItem[]> {
  try {
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
      // claimCode intentionally omitted — revealed only after order creation
      status: "UNUSED",
    }));
  } catch (error) {
    console.error("Error fetching giftcards:", error);
    return [];
  }
}

/**
 * Returns giftcards WITH claimCode and pinCode for a given order.
 * Only callable by the order's owner — used to reveal codes after order creation.
 */
export async function getOrderCards(orderId: string): Promise<BuyGiftcardItem[]> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: {
          include: {
            brand: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!order) throw new Error("Order not found");

    if (order.userId !== session.user.id) {
      throw new Error("Not authorized to view this order");
    }

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
  } catch (error) {
    console.error("Error fetching order cards:", error);
    return [];
  }
}

/**
 * Reports an issue for a specific giftcard within an order.
 * Updates the giftcard status and creates a GiftcardIssue record.
 */
export async function reportGiftcardIssue(data: {
  giftcardId: string;
  orderId: string;
  issueType: string;
  reportedAmount?: number;
  proofImageUrl?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) throw new Error("Order not found");
    if (order.userId !== session.user.id) throw new Error("Not authorized");

    // Fetch the giftcard to get its seller (ownerId)
    const giftcard = await prisma.giftcard.findUnique({
      where: { id: data.giftcardId },
      select: { ownerId: true },
    });

    if (!giftcard) throw new Error("Giftcard not found");

    const issueType = data.issueType as "INVALID" | "ALREADY_USED" | "DEACTIVATED" | "WRONG_AMOUNT";

    const [issue] = await prisma.$transaction([
      prisma.giftcardIssue.create({
        data: {
          issueType,
          reportedAmount: data.reportedAmount != null ? new Prisma.Decimal(data.reportedAmount) : undefined,
          proofImageUrl: data.proofImageUrl,
          giftcardId: data.giftcardId,
          orderId: data.orderId,
          reportedById: session.user.id,
          sellerId: giftcard.ownerId ?? undefined,
        },
      }),
      prisma.giftcard.update({
        where: { id: data.giftcardId },
        data: {
          status: issueType,
          reportedAmount: issueType === "WRONG_AMOUNT" && data.reportedAmount != null ? new Prisma.Decimal(data.reportedAmount) : undefined,
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
  } catch (error) {
    console.error("Error reporting giftcard issue:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to report issue" };
  }
}

/**
 * Removes a previously reported issue and resets the giftcard back to UNUSED.
 */
export async function undoGiftcardIssue(giftcardId: string, orderId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error("Order not found");
    if (order.userId !== session.user.id) throw new Error("Not authorized");

    await prisma.$transaction([
      prisma.giftcardIssue.deleteMany({
        where: { giftcardId, orderId },
      }),
      prisma.giftcard.update({
        where: { id: giftcardId },
        data: {
          status: "UNUSED",
          reportedAmount: null,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error undoing giftcard issue:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to undo issue" };
  }
}
