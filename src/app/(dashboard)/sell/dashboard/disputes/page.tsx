import { Metadata } from "next";
import { getSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { DisputeStatus } from "@/generated/prisma/client";
import { SellerDisputesList } from "./seller-disputes-list";

export const metadata: Metadata = {
  title: "Order Disputes | Seller Dashboard",
  description: "View disputes on your orders",
};

export default async function SellerDisputesPage() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return (
      <div className="p-8 text-center">
        <p>Please log in to view disputes.</p>
      </div>
    );
  }

  // Get all giftcards from this seller (through batches)
  const sellerGiftcards = await prisma.giftcard.findMany({
    where: {
      ownerId: session.user.id,
    },
    select: {
      id: true,
      orderId: true,
    },
  });

  const orderIds = [...new Set(sellerGiftcards.map((g) => g.orderId).filter(Boolean))] as string[];

  // Get orders with disputes that contain this seller's giftcards
  const disputes = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      disputeStatus: {
        not: DisputeStatus.NONE,
      },
    },
    include: {
      giftcards: {
        where: {
          ownerId: session.user.id,
        },
        include: {
          brand: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Convert decimals to numbers
  const disputesWithNumbers = disputes.map((order) => ({
    ...order,
    total: Number(order.total),
    confirmedTotal: order.confirmedTotal ? Number(order.confirmedTotal) : null,
    disputeDifference: order.disputeDifference ? Number(order.disputeDifference) : null,
    giftcards: order.giftcards.map((card) => ({
      ...card,
      amount: Number(card.amount),
      reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Disputes</h1>
        <p className="text-muted-foreground">
          Disputes related to your gift cards
        </p>
      </div>

      <SellerDisputesList disputes={disputesWithNumbers} />
    </div>
  );
}
