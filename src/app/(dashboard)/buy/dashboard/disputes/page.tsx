import { Metadata } from "next";
import { getSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { DisputeStatus } from "@/generated/prisma/client";
import { BuyerDisputesList } from "./buyer-disputes-list";

export const metadata: Metadata = {
  title: "My Disputes | Dashboard",
  description: "View your order disputes",
};

export default async function BuyerDisputesPage() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return (
      <div className="p-8 text-center">
        <p>Please log in to view your disputes.</p>
      </div>
    );
  }

  // Get all disputes for this buyer (not just pending)
  const disputes = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      disputeStatus: {
        not: DisputeStatus.NONE,
      },
    },
    include: {
      giftcards: {
        include: {
          brand: true,
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
        <h1 className="text-3xl font-bold">My Disputes</h1>
        <p className="text-muted-foreground">
          Track your order amount discrepancies
        </p>
      </div>

      <BuyerDisputesList disputes={disputesWithNumbers} />
    </div>
  );
}
