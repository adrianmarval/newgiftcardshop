import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { getSellerBatches } from "@/actions/seller-actions";
import { SellerCardsView } from "@/components/sell/seller-cards-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Cards History | Solmaira Cards",
  description: "View and track your gift card batches, sales, and payments.",
};

export default async function SellerCardsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sell/auth/login");
  }

  // Double check roles if needed, though layout usually handles this.
  // But for this specific dashboard, we want to be sure.
  const userRoles = (session.user as any).role || [];
  if (!userRoles.includes("SELLER")) {
    redirect("/sell/dashboard");
  }

  const batches = await getSellerBatches();

  // Serializing for the client (though our action already did some)
  const serializedBatches = JSON.parse(JSON.stringify(batches));

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black italic tracking-tighter">MY CARDS</h1>
        <p className="text-muted-foreground text-sm">Track your inventory, sales status, and payment reports.</p>
      </div>

      <SellerCardsView initialBatches={serializedBatches} />
    </div>
  );
}
