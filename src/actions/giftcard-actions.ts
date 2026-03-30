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

export async function updateOrderTotal(orderId: string, total: number) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        total: new Prisma.Decimal(total),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating order total:", error);
    return { success: false, error: "Failed to update order total" };
  }
}
