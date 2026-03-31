"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { encrypt, decrypt, hashCode } from "@/lib/encryption";

export async function publishBatch(data: {
  cards: Array<{ amount: string; claimCode: string; pinCode?: string }>;
  brandId: string;
  countryId: string;
}): Promise<{ success: true; batchId: string; duplicates: string[] } | { success: false; error: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Validate brandId and countryId
    if (!data.brandId || !data.countryId) {
      return { success: false, error: "Brand and country are required" };
    }

    // Fetch user with sellRate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sellRate: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Filter valid cards: amount > 0 and non-empty claimCode
    const validCards = data.cards.filter((card) => {
      const amount = parseFloat(card.amount);
      return !isNaN(amount) && amount > 0 && card.claimCode.trim().length > 0;
    });

    if (validCards.length === 0) {
      return { success: false, error: "No valid cards provided" };
    }

    // Hash all valid claim codes to check for duplicates
    const hashedCodes = validCards.map((card) => hashCode(card.claimCode.trim()));

    // Query DB for existing codeHashes
    const existingCards = await prisma.giftcard.findMany({
      where: { codeHash: { in: hashedCodes } },
      select: { codeHash: true },
    });

    const existingHashes = new Set(existingCards.map((c) => c.codeHash));

    // Separate duplicates from unique cards
    const duplicates: string[] = [];
    const uniqueCards: Array<{ amount: string; claimCode: string; pinCode?: string }> = [];

    for (let i = 0; i < validCards.length; i++) {
      const card = validCards[i];
      const hash = hashedCodes[i];
      if (existingHashes.has(hash)) {
        duplicates.push(card.claimCode.trim());
      } else {
        uniqueCards.push(card);
      }
    }

    if (uniqueCards.length === 0) {
      return { success: false, error: "All cards are duplicates" };
    }

    // Encrypt claim codes and pin codes for unique cards
    const encryptedCards = uniqueCards.map((card) => ({
      claimCode: encrypt(card.claimCode.trim()),
      codeHash: hashCode(card.claimCode.trim()),
      pinCode: card.pinCode && card.pinCode.trim().length > 0 ? encrypt(card.pinCode.trim()) : null,
      amount: new Prisma.Decimal(parseFloat(card.amount)),
    }));

    const sellRateSnapshot = user.sellRate;

    // Create batch + giftcards in a transaction
    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.giftcardBatch.create({
        data: {
          userId,
          sellRate: sellRateSnapshot,
          isPaid: false,
        },
      });

      await tx.giftcard.createMany({
        data: encryptedCards.map((card) => ({
          claimCode: card.claimCode,
          codeHash: card.codeHash,
          pinCode: card.pinCode,
          amount: card.amount,
          ownerId: userId,
          brandId: data.brandId,
          countryId: data.countryId,
          inStock: true,
          status: "UNUSED",
          batchId: createdBatch.id,
        })),
      });

      return createdBatch;
    });

    return { success: true, batchId: batch.id, duplicates };
  } catch (error) {
    console.error("Error publishing batch:", error);
    return { success: false, error: "Failed to publish batch" };
  }
}

export async function getSellerBatches() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  try {
    const batches = await prisma.giftcardBatch.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        giftcards: {
          include: {
            brand: true,
            country: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return batches.map((batch) => {
      const sellRate = Number(batch.sellRate);

      const giftcards = batch.giftcards.map((card) => {
        let claimCode = card.claimCode;
        let pinCode = card.pinCode ?? null;

        try {
          claimCode = decrypt(card.claimCode);
        } catch {
          // Legacy unencrypted data — return raw value
        }

        if (card.pinCode) {
          try {
            pinCode = decrypt(card.pinCode);
          } catch {
            // Legacy unencrypted data — return raw value
            pinCode = card.pinCode;
          }
        }

        return {
          ...card,
          claimCode,
          pinCode,
          amount: Number(card.amount),
          reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
        };
      });

      // Compute effective total server-side (only confirmed cards contribute)
      // USED → face amount, WRONG_AMOUNT → reportedAmount, INVALID/ALREADY_USED/DEACTIVATED → $0
      const effectiveTotal = giftcards.reduce((sum, g) => {
        if (!g.isConfirmed) return sum;
        if (g.status === "USED") return sum + g.amount;
        if (g.status === "WRONG_AMOUNT") return sum + (g.reportedAmount || 0);
        return sum;
      }, 0);

      const estimatedPayout = effectiveTotal * sellRate;

      return {
        ...batch,
        sellRate,
        isPaid: batch.isPaid,
        effectiveTotal,
        estimatedPayout,
        giftcards,
        payments: batch.payments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
          balanceAfter: Number(payment.balanceAfter),
        })),
      };
    });
  } catch (error) {
    console.error("Error fetching seller batches:", error);
    return [];
  }
}

export async function getSellerRate(): Promise<number> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) return 75.0;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sellRate: true },
    });

    return user?.sellRate ? user.sellRate.toNumber() : 0.75;
  } catch (error) {
    console.error("Error fetching seller rate:", error);
    return 0.75;
  }
}
