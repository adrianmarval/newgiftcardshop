"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, buyerActionClient } from "@/lib/safe-action";
import z from "zod";

export const getUserBuyRate = buyerActionClient.action(async ({ ctx }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: { buyRate: true },
  });
  return dbUser?.buyRate ? dbUser.buyRate.toNumber() : 85.0;
});

/**
 * Creates a buy order and reserves the giftcards (marks inStock: false)
 * inside a transaction so the reservation is atomic with order creation.
 */
export const createOrder = buyerActionClient
  .inputSchema(z.object({ giftcardIds: z.array(z.string()) }))
  .useValidated(async ({ parsedInput: { giftcardIds }, ctx, next }) => {
    const [dbUser, giftcards] = await Promise.all([
      prisma.user.findUnique({ where: { id: ctx.auth.user.id } }),
      prisma.giftcard.findMany({ where: { id: { in: giftcardIds } } }),
    ]);

    if (!dbUser) throw new ActionError("User not found in database");

    return next({
      ctx: {
        dbUser,
        giftcards,
      },
    });
  })
  .action(async ({ parsedInput: { giftcardIds }, ctx }) => {
    const total = ctx.giftcards.reduce((sum, card) => {
      return sum + card.amount.toNumber() * ctx.dbUser.buyRate.toNumber();
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: ctx.auth.user.id,
          total: new Prisma.Decimal(total),
          buyRate: ctx.dbUser.buyRate,
          status: "PENDING",
          giftcards: {
            connect: giftcardIds.map((id) => ({ id })),
          },
        },
      });

      await tx.giftcard.updateMany({
        where: { id: { in: giftcardIds } },
        data: { inStock: false },
      });

      return createdOrder;
    });

    return { success: true, orderId: order.id };
  });

/**
 * Locks in the buyer's issue reports and moves the order to AWAITING_PAYMENT.
 * Calculates the adjustedTotal based on effective card amounts and the buyer's rate.
 */
export const confirmOrderUsage = buyerActionClient
  .inputSchema(z.object({ orderId: z.string() }))
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });

    if (!order) throw new ActionError("Order not found");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("Not authorized");
    if (order.status !== "PENDING") throw new ActionError("Order cannot be confirmed in its current state");
    return next({ ctx: { order } });
  })
  .action(async ({ parsedInput: { orderId }, ctx }) => {
    const order = ctx.order;
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
      data: { status: "AWAITING_PAYMENT", adjustedTotal: new Prisma.Decimal(adjustedTotal) },
    });

    return { success: true, adjustedTotal };
  });

/**
 * Completes a buy order after the buyer notifies payment.
 * Order must be in AWAITING_PAYMENT state (i.e. confirmOrderUsage was called).
 * Updates each giftcard status based on the reported issue type.
 */

export const completeOrder = buyerActionClient
  .inputSchema(z.object({ orderId: z.string(), _transactionId: z.string() }))
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError("Order not found");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("Not authorized to complete this order");
    if (order.status === "COMPLETED") throw new ActionError("Order is already completed");
    if (order.status !== "AWAITING_PAYMENT") throw new ActionError("Order must be confirmed before payment can be submitted");
    return next({ ctx: { order } });
  })
  .action(async ({ parsedInput: { _transactionId }, ctx }) => {
    const { order } = ctx;
    const paymentAmount = order.adjustedTotal ?? order.total;
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          amount: paymentAmount,
          balanceAfter: 0,
          status: "COMPLETED",
          transactionType: "DEBIT",
          orderId: order.id,
          transactionId: _transactionId,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED" },
      });
      for (const card of order.giftcards) {
        if (card.status === "UNUSED") {
          // Card was used successfully with no issues
          await tx.giftcard.update({
            where: { id: card.id },
            data: { status: "USED", isConfirmed: true },
          });
        } else {
          // WRONG_AMOUNT, INVALID, ALREADY_USED, DEACTIVATED: keep status as-is, mark confirmed
          await tx.giftcard.update({
            where: { id: card.id },
            data: { isConfirmed: true, status: card.status },
          });
        }
      }
    });
    return {
      success: true,
      orderId: order.id,
      message: "Order completed successfully",
    };
  });

/**
 * Cancels a buy order. The buyer can cancel their own PENDING orders.
 * Giftcards are NOT returned to stock (inStock stays false, status stays as-is).
 */
export const cancelOrder = buyerActionClient
  .inputSchema(z.object({ orderId: z.string() }))
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order) throw new ActionError("Order not found in database");
    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    await prisma.order.update({
      where: { id: ctx.order.id },
      data: { status: "CANCELLED" },
    });
    return { success: true, message: "Order cancelled successfully!" };
  });

/**
 * Fetches orders for the authenticated buyer, including giftcards and payments.
 */
export const getBuyerOrders = buyerActionClient.action(async ({ ctx }) => {
  const orders = await prisma.order.findMany({
    where: { userId: ctx.auth.user.id },
    include: { giftcards: { include: { brand: true } }, payments: { where: { status: "COMPLETED" } } },
    orderBy: { createdAt: "desc" },
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
});
