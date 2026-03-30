import { Metadata } from "next";
import { getAllDisputes } from "@/actions/dispute-actions";
import { DisputesList } from "./disputes-list";

export const metadata: Metadata = {
  title: "Disputes | Admin Dashboard",
  description: "Manage order disputes and amount discrepancies",
};

export default async function DisputesPage() {
  const disputes = await getAllDisputes();
  const pendingCount = disputes.filter(d => d.disputeStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-muted-foreground">
            Manage order amount discrepancies between buyers and sellers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-yellow-500 font-medium">
            {pendingCount} awaiting action
          </span>
          <span className="text-sm text-muted-foreground">
            {disputes.length} total
          </span>
        </div>
      </div>

      <DisputesList initialDisputes={disputes} />
    </div>
  );
}
