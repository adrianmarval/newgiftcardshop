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

    const selectedGiftcards = await findGiftcardCombination(giftcards, amount);
    return selectedGiftcards.selectedCards.map((card) => ({
      id: card.id,
      brand: card.brandId,
      amount: card.amount.toNumber(),
      price: card.price ? card.price.toNumber() : card.amount.toNumber(),
      claimCode: card.claimCode,
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

    const order = await prisma.order.create({
      data: {
        userId,
        total: new Prisma.Decimal(total),
        status: "PENDING",
        giftcards: {
          connect: giftcardIds.map((id) => ({ id })),
        },
      },
    });

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order" };
  }
}

/**
 * Confirma el monto final de una orden después de que el buyer verifica las tarjetas
 * Guarda el monto confirmado por el buyer
 */
export async function confirmOrderTotal(orderId: string, confirmedTotal: number) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Verificar que la orden pertenece al buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order || order.userId !== session.user.id) {
      throw new Error("Not authorized to confirm this order");
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        confirmedTotal: new Prisma.Decimal(confirmedTotal),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error confirming order total:", error);
    return { success: false, error: "Failed to confirm order total" };
  }
}

/**
 * @deprecated Use confirmOrderTotal instead
 */
export async function updateOrderTotal(orderId: string, total: number) {
  return confirmOrderTotal(orderId, total);
}

/**
 * Completa una orden después de que el buyer confirma el pago
 * Marca la orden como COMPLETED y actualiza el estado de las tarjetas
 */
export async function completeOrder(orderId: string, paymentMethod: string, transactionId?: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Verificar que la orden existe y pertenece al buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== session.user.id) {
      throw new Error("Not authorized to complete this order");
    }

    if (order.status === "COMPLETED") {
      throw new Error("Order is already completed");
    }

    // Crear registro de pago
    await prisma.payment.create({
      data: {
        amount: order.confirmedTotal || order.total,
        balanceAfter: 0,
        status: "COMPLETED",
        transactionType: "DEBIT",
        orderId: orderId,
      },
    });

    // Actualizar estado de la orden a COMPLETED
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
      },
    });

    // Actualizar estado de las giftcards a USED
    for (const card of order.giftcards) {
      await prisma.giftcard.update({
        where: { id: card.id },
        data: {
          status: "USED",
          isConfirmed: true,
        },
      });
    }

    return { 
      success: true, 
      orderId,
      message: "Order completed successfully"
    };
  } catch (error) {
    console.error("Error completing order:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete order" };
  }
}

/**
 * Obtiene las órdenes del buyer con sus estados
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
      confirmedTotal: order.confirmedTotal ? Number(order.confirmedTotal) : null,
      giftcards: order.giftcards.map((card) => ({
        ...card,
        amount: Number(card.amount),
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
        price: Number(card.price),
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
