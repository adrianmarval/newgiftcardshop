"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Clock,
  Info
} from "lucide-react";
import type { Dispute } from "@/types";

interface BuyerDisputesListProps {
  disputes: Dispute[];
}

export function BuyerDisputesList({ disputes }: BuyerDisputesListProps) {
  const pendingDisputes = disputes.filter((d) => d.disputeStatus === "PENDING");
  const resolvedDisputes = disputes.filter((d) => ["RESOLVED", "ACCEPTED", "REJECTED"].includes(d.disputeStatus));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "ACCEPTED":
        return <Badge variant="outline" className="border-green-500 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="border-red-500 text-red-500"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string | null) => {
    if (type === "OVERPAID") {
      return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
    }
    if (type === "UNDERPAID") {
      return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  };

  const getTypeLabel = (type: string | null) => {
    if (type === "OVERPAID") return "You paid too much";
    if (type === "UNDERPAID") return "You paid too little";
    return "Dispute";
  };

  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No disputes</h3>
          <p className="text-muted-foreground text-center mt-2">
            You don't have any order disputes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Disputes */}
      {pendingDisputes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending ({pendingDisputes.length})
          </h2>
          <div className="grid gap-4">
            {pendingDisputes.map((dispute) => (
              <Card key={dispute.id} className="border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(dispute.disputeType)}
                      <div>
                        <div className="font-medium">Order #{dispute.id.slice(-8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTypeLabel(dispute.disputeType)}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(dispute.disputeStatus)}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm bg-muted/50 p-3 rounded-lg mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Original Total</div>
                      <div className="font-semibold">${dispute.total.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Confirmed</div>
                      <div className="font-semibold">${(dispute.confirmedTotal || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Difference</div>
                      <div className={`font-semibold ${dispute.disputeDifference && dispute.disputeDifference > 0 ? 'text-orange-500' : 'text-blue-500'}`}>
                        ${Math.abs(dispute.disputeDifference || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {dispute.disputeReason && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      {dispute.disputeReason}
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-500">What happens next?</div>
                        {dispute.disputeType === "OVERPAID" && (
                          <p className="text-muted-foreground text-xs mt-1">
                            An admin will review and process the refund to your account.
                          </p>
                        )}
                        {dispute.disputeType === "UNDERPAID" && (
                          <p className="text-muted-foreground text-xs mt-1">
                            You'll need to complete the payment for the remaining amount.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Disputes */}
      {resolvedDisputes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Resolved ({resolvedDisputes.length})
          </h2>
          <div className="grid gap-4">
            {resolvedDisputes.map((dispute) => (
              <Card key={dispute.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(dispute.disputeType)}
                      <div>
                        <div className="font-medium">Order #{dispute.id.slice(-8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTypeLabel(dispute.disputeType)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(dispute.disputeStatus)}
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          ${Math.abs(dispute.disputeDifference || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">difference</div>
                      </div>
                    </div>
                  </div>
                  {dispute.disputeNotes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Resolution: {dispute.disputeNotes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
