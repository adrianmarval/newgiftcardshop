"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function getSellerBatches() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const batches = await prisma.giftcardBatch.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        giftcards: {
          include: {
            brand: true,
            country: true
          }
        },
        payments: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Convert decimal to numbers for client safety
    return batches.map(batch => ({
      ...batch,
      giftcards: batch.giftcards.map(card => ({
        ...card,
        amount: Number(card.amount),
        price: Number(card.price)
      })),
      payments: batch.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
        balanceAfter: Number(payment.balanceAfter)
      }))
    }));

  } catch (error) {
    console.error("Error fetching seller batches:", error);
    return [];
  }
}
