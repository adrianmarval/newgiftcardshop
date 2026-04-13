"use server";

import prisma from "@/lib/prisma";
import { OrderStatus, Prisma } from "@/generated/prisma/client";
import { decrypt } from "@/lib/encryption";
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
 *
 * Guard: Only allows cancellation when effective amount is $0 (all cards INVALID/ALREADY_USED/DEACTIVATED
 * with zero reportedAmount).
 */
export const cancelOrder = buyerActionClient
  .inputSchema(z.object({ orderId: z.string() }))
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError("Order not found in database");

    // Cancel guard: check effective amount === 0
    const hasActiveCards = order.giftcards.some((g) => {
      // UNUSED or USED cards have value
      if (g.status === "UNUSED" || g.status === "USED") return true;
      // WRONG_AMOUNT with reportedAmount > 0 has value
      if (g.status === "WRONG_AMOUNT" && g.reportedAmount && g.reportedAmount.toNumber() > 0) return true;
      return false;
    });

    if (hasActiveCards) {
      throw new ActionError("Cannot cancel: order contains active cards with value. Wait for completion or contact support.");
    }

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    await prisma.order.update({
      where: { id: ctx.order.id },
      data: { status: "CANCELLED" },
    });
    return { success: true, message: "Order cancelled successfully!" };
  });

// Helper to compute effective total for an order's giftcards
function computeEffectiveTotal(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: number,
): number {
  const rawTotal = giftcards.reduce((sum, card) => {
    if (card.status === "UNUSED") return sum + card.amount.toNumber();
    if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ? card.reportedAmount.toNumber() : 0);
    return sum; // INVALID, ALREADY_USED, DEACTIVATED, USED contribute $0
  }, 0);
  return rawTotal * buyRate;
}

/**
 * Fetches a single order by exact ID for the authenticated buyer.
 * Used by the resume flow to hydrate the buy-flow store.
 */
export const getOrderById = buyerActionClient
  .inputSchema(z.object({ orderId: z.string() }))
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: { include: { brand: true, country: true } },
        payments: { where: { status: "COMPLETED" } },
      },
    });

    if (!order) throw new ActionError("Order not found");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("Not authorized to view this order");

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    const { order } = ctx;

    const effectiveTotal = computeEffectiveTotal(order.giftcards, order.buyRate.toNumber());
    return {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      total: Number(order.total),
      adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
      buyRate: Number(order.buyRate),
      effectiveTotal,
      giftcards: order.giftcards.map((card) => {
        let claimCode = card.claimCode;
        let pinCode = card.pinCode ?? null;
        try {
          claimCode = decrypt(card.claimCode);
        } catch {
          /* legacy unencrypted */
        }
        if (card.pinCode) {
          try {
            pinCode = decrypt(card.pinCode);
          } catch {
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
      }),
      payments: order.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        balanceAfter: Number(p.balanceAfter),
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });

/**
 * Fetches orders for the authenticated buyer, including giftcards and payments.
 * Supports pagination, filtering by status, search by order ID, and sorting.
 */
export const getBuyerOrders = buyerActionClient
  .inputSchema(
    z.object({
      page: z.number().int().positive().optional().default(1),
      limit: z.number().int().positive().max(100).optional().default(10),
      status: z.enum(OrderStatus).optional(),
      search: z.string().optional(),
      sort: z.enum(["newest", "oldest"]).optional().default("newest"),
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { page, limit, status, search, sort } = parsedInput;
    const skip = (page - 1) * limit;
    const orderBy = sort === "newest" ? { createdAt: "desc" as const } : { createdAt: "asc" as const };

    // Build where clause
    const where: Prisma.OrderWhereInput = { userId: ctx.auth.user.id };
    if (status) where.status = status;
    if (search) where.id = { contains: search, mode: "insensitive" };

    // Parallel queries: data + count
    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          giftcards: { include: { brand: true, country: true } },
          payments: { where: { status: "COMPLETED" } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      orders: orders.map((order) => {
        const effectiveTotal = computeEffectiveTotal(order.giftcards, order.buyRate.toNumber());
        return {
          ...order,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          total: Number(order.total),
          adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
          buyRate: Number(order.buyRate),
          effectiveTotal,
          giftcards: order.giftcards.map((card) => {
            let claimCode = card.claimCode;
            let pinCode = card.pinCode ?? null;
            try {
              claimCode = decrypt(card.claimCode);
            } catch {
              /* legacy unencrypted */
            }
            if (card.pinCode) {
              try {
                pinCode = decrypt(card.pinCode);
              } catch {
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
          }),
          payments: order.payments.map((p) => ({
            ...p,
            amount: Number(p.amount),
            balanceAfter: Number(p.balanceAfter),
            createdAt: p.createdAt.toISOString(),
          })),
        };
      }),
      totalCount,
      totalPages,
      currentPage: page,
    };
  });
