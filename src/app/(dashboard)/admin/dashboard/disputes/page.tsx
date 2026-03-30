import { Metadata } from "next";
import { getPendingDisputes } from "@/actions/dispute-actions";
import { DisputesList } from "./disputes-list";

export const metadata: Metadata = {
  title: "Disputes | Admin Dashboard",
  description: "Manage order disputes and amount discrepancies",
};

export default async function DisputesPage() {
  const disputes = await getPendingDisputes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-muted-foreground">
            Manage order amount discrepancies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {disputes.length} pending
          </span>
        </div>
      </div>

      <DisputesList initialDisputes={disputes} />
    </div>
  );
}
