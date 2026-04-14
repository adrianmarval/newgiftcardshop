"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { decrypt } from "@/lib/encryption";
import { ActionError, buyerActionClient } from "@/lib/safe-action";
import { buyerOrderSchema } from "@/types/order/buyer-order";
import {
  getUserBuyRateOutputSchema,
  createOrderInputSchema,
  createOrderOutputSchema,
  confirmOrderUsageInputSchema,
  confirmOrderUsageOutputSchema,
  completeOrderInputSchema,
  completeOrderOutputSchema,
  cancelOrderInputSchema,
  cancelOrderOutputSchema,
  getOrderByIdInputSchema,
  getOrderByIdOutputSchema,
  getBuyerOrdersInputSchema,
  getBuyerOrdersOutputSchema,
} from "@/types/order/actions";

export const getUserBuyRate = buyerActionClient.outputSchema(getUserBuyRateOutputSchema).action(async ({ ctx }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: { buyRate: true },
  });
  return { success: true as const, rate: dbUser?.buyRate ? dbUser.buyRate.toNumber() : 85.0 };
});

export const createOrder = buyerActionClient
  .inputSchema(createOrderInputSchema)
  .outputSchema(createOrderOutputSchema)
  .useValidated(async ({ parsedInput: { giftcardIds }, ctx, next }) => {
    const [dbUser, giftcards] = await Promise.all([
      prisma.user.findUnique({ where: { id: ctx.auth.user.id } }),
      prisma.giftcard.findMany({ where: { id: { in: giftcardIds } } }),
    ]);

    if (!dbUser) throw new ActionError("Usuario no encontrado en la base de datos");

    return next({
      ctx: {
        dbUser,
        giftcards,
      },
    });
  })
  .action(async ({ parsedInput: { giftcardIds }, ctx }) => {
    const total = ctx.giftcards.reduce((sum, card) => {
      // Use Prisma Decimal arithmetic to avoid floating-point precision loss
      return sum.plus(card.amount.mul(ctx.dbUser.buyRate));
    }, new Prisma.Decimal(0));

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: ctx.auth.user.id,
          total: total,
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

    return { success: true as const, orderId: order.id };
  });

export const confirmOrderUsage = buyerActionClient
  .inputSchema(confirmOrderUsageInputSchema)
  .outputSchema(confirmOrderUsageOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });

    if (!order) throw new ActionError("Orden no encontrada");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("No autorizado");
    if (order.status !== "PENDING") throw new ActionError("La orden no puede ser confirmada en su estado actual");
    return next({ ctx: { order } });
  })
  .action(async ({ parsedInput: { orderId }, ctx }) => {
    const order = ctx.order;
    // Calculate effective total using Prisma Decimal to avoid floating-point precision loss:
    // UNUSED         → face value
    // WRONG_AMOUNT   → reportedAmount
    // INVALID / ALREADY_USED / DEACTIVATED → 0
    const adjustedTotal = computeEffectiveTotal(order.giftcards, order.buyRate);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "AWAITING_PAYMENT", adjustedTotal: new Prisma.Decimal(adjustedTotal) },
    });

    return { success: true as const, adjustedTotal };
  });

export const completeOrder = buyerActionClient
  .inputSchema(completeOrderInputSchema)
  .outputSchema(completeOrderOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError("Orden no encontrada");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("No estás autorizado para completar esta orden");
    if (order.status === "COMPLETED") throw new ActionError("La orden ya ha sido completada");
    if (order.status !== "AWAITING_PAYMENT") throw new ActionError("La orden debe ser confirmada antes de enviar el pago");
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
      success: true as const,
      orderId: order.id,
      message: "Orden completada con éxito",
    };
  });

export const cancelOrder = buyerActionClient
  .inputSchema(cancelOrderInputSchema)
  .outputSchema(cancelOrderOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError("Orden no encontrada en la base de datos");

    // Cancel guard: check effective amount === 0
    const hasActiveCards = order.giftcards.some((g) => {
      // UNUSED or USED cards have value
      if (g.status === "UNUSED" || g.status === "USED") return true;
      // WRONG_AMOUNT with reportedAmount > 0 has value
      if (g.status === "WRONG_AMOUNT" && g.reportedAmount && g.reportedAmount.toNumber() > 0) return true;
      return false;
    });

    if (hasActiveCards) {
      throw new ActionError("No se puede cancelar: la orden contiene tarjetas activas con valor. Espera a que se complete o contacta al soporte.");
    }

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    await prisma.order.update({
      where: { id: ctx.order.id },
      data: {
        status: "CANCELLED",
        giftcards: {
          updateMany: {
            where: {
              id: { in: ctx.order.giftcards.map((g) => g.id) },
            },
            data: { isConfirmed: true },
          },
        },
      },
    });
    return { success: true as const, message: "¡Orden cancelada con éxito!" };
  });

// Helper to compute effective total for an order's giftcards
// Uses Prisma Decimal arithmetic to avoid floating-point precision loss
function computeEffectiveTotal(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: Prisma.Decimal,
): number {
  const rawTotal = giftcards.reduce((sum, card) => {
    if (card.status === "UNUSED") return sum.plus(card.amount);
    if (card.status === "WRONG_AMOUNT") return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    return sum; // INVALID, ALREADY_USED, DEACTIVATED, USED contribute $0
  }, new Prisma.Decimal(0));
  return rawTotal.mul(buyRate).toNumber();
}

// Helper to serialize a giftcard for output
function serializeGiftcard(card: {
  claimCode: string;
  pinCode: string | null;
  amount: Prisma.Decimal;
  reportedAmount: Prisma.Decimal | null;
  status: string;
  isConfirmed: boolean;
  orderId: string | null;
  brand: { name: string; icon: string; image: string | null };
  country: { name: string; code: string } | null;
}) {
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
    claimCode,
    pinCode,
    amount: Number(card.amount),
    reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
    status: card.status,
    isConfirmed: card.isConfirmed,
    orderId: card.orderId,
    brand: {
      name: card.brand.name,
      icon: card.brand.icon,
      image: card.brand.image,
    },
    country: card.country,
  };
}

// Helper to serialize a payment for output
function serializePayment(payment: {
  amount: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  status: string;
  transactionType: string;
  createdAt: Date;
}) {
  return {
    amount: Number(payment.amount),
    balanceAfter: Number(payment.balanceAfter),
    status: payment.status,
    transactionType: payment.transactionType,
    createdAt: payment.createdAt.toISOString(),
  };
}

// orderShapeSchema uses the imported schemas from @/types/order/buyer-order
// CRITICAL FIX: transactionType is now included in serializePayment output
// and buyerOrderPaymentSchema includes it (unlike the original inline definition)
const orderShapeSchema = buyerOrderSchema;

export const getOrderById = buyerActionClient
  .inputSchema(getOrderByIdInputSchema)
  .outputSchema(getOrderByIdOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: { include: { brand: true, country: true } },
        payments: { where: { status: "COMPLETED" } },
      },
    });

    if (!order) throw new ActionError("Orden no encontrada");
    if (order.userId !== ctx.auth.user.id) throw new ActionError("No estás autorizado para ver esta orden");

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    const { order } = ctx;

    const effectiveTotal = computeEffectiveTotal(order.giftcards, order.buyRate);
    return {
      success: true as const,
      order: {
        id: order.id,
        status: order.status,
        total: Number(order.total),
        adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
        buyRate: Number(order.buyRate),
        effectiveTotal,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        giftcards: order.giftcards.map((card) => ({
          id: card.id,
          ...serializeGiftcard(card),
        })),
        payments: order.payments.map((p) => ({
          id: p.id,
          ...serializePayment(p),
        })),
      },
    };
  });

export const getBuyerOrders = buyerActionClient
  .inputSchema(getBuyerOrdersInputSchema)
  .outputSchema(getBuyerOrdersOutputSchema)
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
      success: true as const,
      orders: orders.map((order) => {
        const effectiveTotal = computeEffectiveTotal(order.giftcards, order.buyRate);
        return {
          id: order.id,
          status: order.status,
          total: Number(order.total),
          adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
          buyRate: Number(order.buyRate),
          effectiveTotal,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          giftcards: order.giftcards.map((card) => ({
            id: card.id,
            ...serializeGiftcard(card),
          })),
          payments: order.payments.map((p) => ({
            id: p.id,
            ...serializePayment(p),
          })),
        };
      }),
      totalCount,
      totalPages,
      currentPage: page,
    };
  });
