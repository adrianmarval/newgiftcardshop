import { Metadata } from "next";
import { getSellerDisputes } from "@/actions/dispute-actions";
import { SellerDisputesList } from "./seller-disputes-list";

export const metadata: Metadata = {
  title: "Order Disputes | Seller Dashboard",
  description: "View and respond to disputes on your orders",
};

export default async function SellerDisputesPage() {
  const disputes = await getSellerDisputes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Disputes</h1>
        <p className="text-muted-foreground">
          Review and respond to disputes about your gift cards
        </p>
      </div>

      <SellerDisputesList disputes={disputes} />
    </div>
  );
}
