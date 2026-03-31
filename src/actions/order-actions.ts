"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";

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

    return user?.buyRate ? user.buyRate.toNumber() : 85.0;
  } catch (error) {
    console.error("Error fetching user buy rate:", error);
    return 85.0;
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

    const total = giftcards.reduce((sum, card) => {
      return sum + card.amount.toNumber() * user.buyRate.toNumber();
    }, 0);

    // Use a transaction to create the order and reserve cards atomically
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          total: new Prisma.Decimal(total),
          buyRate: user.buyRate,
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

    // Calculate effective total:
    // UNUSED         → face value
    // WRONG_AMOUNT   → reportedAmount
    // INVALID / ALREADY_USED / DEACTIVATED → 0
    const rawTotal = order.giftcards.reduce((sum, card) => {
      if (card.status === "UNUSED") return sum + card.amount.toNumber();
      if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ? card.reportedAmount.toNumber() : 0);
      return sum;
    }, 0);

    const adjustedTotal = rawTotal * order.buyRate.toNumber();

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
export async function completeOrder(orderId: string, _paymentMethod: string, _transactionId?: string) {
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
 * Fetches orders for the authenticated buyer, including giftcards and payments.
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
