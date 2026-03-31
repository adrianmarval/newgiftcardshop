"use server";

import { findGiftcardCombination } from "@/lib/browse-giftcards";
import prisma from "@/lib/prisma";
import { BuyGiftcardItem } from "@/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";

export async function getActiveBrands() {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return brands;
  } catch (error) {
    console.error("Error fetching active brands:", error);
    return [];
  }
}

export async function getActiveCountries() {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return countries;
  } catch (error) {
    console.error("Error fetching active countries:", error);
    return [];
  }
}

export async function getBrandById(id: string) {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });
    return brand;
  } catch (error) {
    console.error("Error fetching brand by id:", error);
    return null;
  }
}

export async function getCountryById(id: string) {
  try {
    const country = await prisma.country.findUnique({
      where: { id },
    });
    return country;
  } catch (error) {
    console.error("Error fetching country by id:", error);
    return null;
  }
}

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
      price: card.price ? card.price.toNumber() : card.amount.toNumber(),
      // claimCode intentionally omitted — revealed only after order creation
      status: "UNUSED",
    }));
  } catch (error) {
    console.error("Error fetching giftcards:", error);
    return [];
  }
}

export async function getUserBuyRate() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) return 100.0;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { buyRate: true },
    });

    return user?.buyRate ? user.buyRate.toNumber() : 100.0;
  } catch (error) {
    console.error("Error fetching user buy rate:", error);
    return 100.0;
  }
}

/**
 * Creates a buy order and reserves the giftcards (marks inStock: false)
 * inside a transaction so the reservation is atomic with order creation.
 */
export async function createOrder(giftcardIds: string[]) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Fetch user and giftcards to calculate total with buyRate
    const [user, giftcards] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.giftcard.findMany({ where: { id: { in: giftcardIds } } }),
    ]);

    if (!user) throw new Error("User not found");
    // Ensure buyRate is treated as a percentage (e.g. 85 means 85%)
    const buyRatePercent = user.buyRate ? user.buyRate.toNumber() : 100.0;
    const buyFactor = buyRatePercent / 100;

    const total = giftcards.reduce((sum, card) => {
      return sum + card.amount.toNumber() * buyFactor;
    }, 0);

    // Use a transaction to create the order and reserve cards atomically
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          total: new Prisma.Decimal(total),
          status: "PENDING",
          giftcards: {
            connect: giftcardIds.map((id) => ({ id })),
          },
        },
      });

      // Reserve all selected giftcards so they cannot be purchased by another buyer
      await tx.giftcard.updateMany({
        where: { id: { in: giftcardIds } },
        data: { inStock: false },
      });

      return createdOrder;
    });

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order" };
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

    return order.giftcards.map((card) => ({
      id: card.id,
      brand: card.brandId,
      amount: card.amount.toNumber(),
      price: card.price ? card.price.toNumber() : card.amount.toNumber(),
      claimCode: card.claimCode,
      pinCode: card.pinCode ?? undefined,
      status: (card.status as BuyGiftcardItem["status"]) ?? "UNUSED",
      reportedAmount: card.reportedAmount ? card.reportedAmount.toNumber() : undefined,
      sellerId: card.ownerId ?? undefined,
    }));
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

/**
 * Locks in the buyer's issue reports and moves the order to AWAITING_PAYMENT.
 * Calculates the adjustedTotal based on effective card amounts and the buyer's rate.
 */
export async function confirmOrderUsage(orderId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });

    if (!order) throw new Error("Order not found");
    if (order.userId !== session.user.id) throw new Error("Not authorized");
    if (order.status !== "PENDING") throw new Error("Order cannot be confirmed in its current state");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { buyRate: true },
    });

    const buyRatePercent = user?.buyRate ? user.buyRate.toNumber() : 100.0;
    const buyFactor = buyRatePercent / 100;

    // Calculate effective total:
    // UNUSED         → face value
    // WRONG_AMOUNT   → reportedAmount
    // INVALID / ALREADY_USED / DEACTIVATED → 0
    const rawTotal = order.giftcards.reduce((sum, card) => {
      if (card.status === "UNUSED") return sum + card.amount.toNumber();
      if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ? card.reportedAmount.toNumber() : 0);
      return sum;
    }, 0);

    const adjustedTotal = rawTotal * buyFactor;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "AWAITING_PAYMENT",
        adjustedTotal: new Prisma.Decimal(adjustedTotal),
      },
    });

    return { success: true, adjustedTotal };
  } catch (error) {
    console.error("Error confirming order usage:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to confirm order" };
  }
}

/**
 * Completes a buy order after the buyer notifies payment.
 * Order must be in AWAITING_PAYMENT state (i.e. confirmOrderUsage was called).
 * Updates each giftcard status based on the reported issue type.
 */
export async function completeOrder(orderId: string, paymentMethod: string, transactionId?: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });

    if (!order) throw new Error("Order not found");

    if (order.userId !== session.user.id) {
      throw new Error("Not authorized to complete this order");
    }

    if (order.status === "COMPLETED") {
      throw new Error("Order is already completed");
    }

    if (order.status !== "AWAITING_PAYMENT") {
      throw new Error("Order must be confirmed before payment can be submitted");
    }

    // Use adjustedTotal for the payment; fall back to total if somehow null
    const paymentAmount = order.adjustedTotal ?? order.total;

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          amount: paymentAmount,
          balanceAfter: 0,
          status: "COMPLETED",
          transactionType: "DEBIT",
          orderId,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });

      for (const card of order.giftcards) {
        if (card.status === "UNUSED" || card.status === "WRONG_AMOUNT") {
          // Card was used successfully (WRONG_AMOUNT already has reportedAmount saved)
          await tx.giftcard.update({
            where: { id: card.id },
            data: { status: "USED", isConfirmed: true },
          });
        }
        // INVALID, ALREADY_USED, DEACTIVATED: keep status as-is, isConfirmed stays false
      }
    });

    return {
      success: true,
      orderId,
      message: "Order completed successfully",
    };
  } catch (error) {
    console.error("Error completing order:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete order" };
  }
}

/**
 * Cancels a buy order. The buyer can cancel their own PENDING orders.
 * Giftcards are NOT returned to stock (inStock stays false, status stays as-is).
 */
export async function cancelOrder(orderId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, status: true },
    });

    if (!order) throw new Error("Order not found");

    const isOwner = order.userId === session.user.id;
    const isAdmin = (session.user as { role?: string[] }).role?.includes("ADMIN") ?? false;

    if (!isOwner && !isAdmin) throw new Error("Not authorized to cancel this order");

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to cancel order" };
  }
}

/**
 * Obtains las órdenes del buyer con sus estados.
 */
export async function getBuyerOrders() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        giftcards: {
          include: {
            brand: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return orders.map((order) => ({
      ...order,
      total: Number(order.total),
      adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
      giftcards: order.giftcards.map((card) => ({
        ...card,
        amount: Number(card.amount),
        price: Number(card.price),
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
      })),
      payments: order.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        balanceAfter: Number(p.balanceAfter),
      })),
    }));
  } catch (error) {
    console.error("Error fetching buyer orders:", error);
    return [];
  }
}

/**
 * Retrieves a platform setting value by key. No auth required.
 * Returns null if the key does not exist.
 */
export async function getPlatformSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch (error) {
    console.error("Error fetching platform setting:", error);
    return null;
  }
}

/**
 * Creates or updates a platform setting. Requires ADMIN role.
 */
export async function setPlatformSetting(key: string, value: string, description?: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) throw new Error("Unauthorized");

    const isAdmin = (session.user as { role?: string[] }).role?.includes("ADMIN") ?? false;
    if (!isAdmin) throw new Error("Admin role required");

    await prisma.platformSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting platform setting:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update setting" };
  }
}
