import { redirect } from "next/navigation";
import { getSession } from "@/lib/authorization";
import { getSellerBatches } from "@/actions/seller-actions";
import { SellerCardsView } from "@/components/sell/seller-cards-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Cards History | Solmaira Cards",
  description: "View and track your gift card batches, sales, and payments.",
};

export default async function SellerCardsPage() {
  const batches = await getSellerBatches();

  if (!batches.data) return <p>No batches found</p>;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black italic tracking-tighter">MY CARDS</h1>
        <p className="text-muted-foreground text-base">Track your inventory, sales status, and payment reports.</p>
      </div>

      <SellerCardsView batches={batches.data} />
    </div>
  );
}
