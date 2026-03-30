"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPendingDisputes, getDisputeDetails, resolveDispute } from "@/actions/dispute-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, Eye, Loader2 } from "lucide-react";
import type { DisputeDetails } from "@/types";

interface DisputesListProps {
  initialDisputes: DisputeDetails[];
}

export function DisputesList({ initialDisputes }: DisputesListProps) {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolution, setResolution] = useState<"ACCEPTED" | "REJECTED">("ACCEPTED");
  const [notes, setNotes] = useState("");

  const refreshDisputes = async () => {
    const data = await getPendingDisputes();
    setDisputes(data);
  };

  const handleViewDetails = async (orderId: string) => {
    setIsLoading(true);
    try {
      const details = await getDisputeDetails(orderId);
      if (details) {
        setSelectedDispute(details as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;

    setIsResolving(true);
    try {
      const result = await resolveDispute(selectedDispute.id, resolution, notes);

      if (result.success) {
        setSelectedDispute(null);
        setNotes("");
        await refreshDisputes();
      }
    } finally {
      setIsResolving(false);
    }
  };

  const getDisputeTypeIcon = (type: string | null) => {
    if (type === "OVERPAID") {
      return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
    }
    return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
  };

  const getDisputeTypeBadge = (type: string | null) => {
    if (type === "OVERPAID") {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-500">
          Overpaid
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-blue-500 text-blue-500">
        Underpaid
      </Badge>
    );
  };

  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No pending disputes</h3>
          <p className="text-muted-foreground text-center mt-2">All order amount discrepancies have been resolved.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {disputes.map((dispute) => (
          <Card key={dispute.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getDisputeTypeIcon(dispute.disputeType)}
                  <div>
                    <div className="font-mono text-sm">Order #{dispute.id.slice(-8)}</div>
                    <div className="text-sm text-muted-foreground">
                      {dispute.user?.name || "Unknown"} • {dispute.user?.email || "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {getDisputeTypeBadge(dispute.disputeType)}
                  <div className="text-right">
                    <div className="font-semibold">${Math.abs(dispute.disputeDifference || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">difference</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(dispute.id)} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>Order #{selectedDispute?.id.slice(-8)}</DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Original Total</div>
                  <div className="text-xl font-bold">${selectedDispute.total.toFixed(2)}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Confirmed Total</div>
                  <div className="text-xl font-bold">${(selectedDispute.confirmedTotal || 0).toFixed(2)}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Difference</div>
                  <div
                    className={`text-xl font-bold ${selectedDispute.disputeDifference && selectedDispute.disputeDifference > 0 ? "text-orange-500" : "text-blue-500"}`}
                  >
                    ${Math.abs(selectedDispute.disputeDifference || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Buyer Info */}
              <div>
                <h4 className="font-semibold mb-2">Buyer</h4>
                <div className="text-sm">
                  <div>{selectedDispute.user?.name || "Unknown"}</div>
                  <div className="text-muted-foreground">{selectedDispute.user?.email || "Unknown"}</div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h4 className="font-semibold mb-2">Dispute Reason</h4>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedDispute.disputeReason}</p>
              </div>

              {/* Giftcards */}
              <div>
                <h4 className="font-semibold mb-2">Gift Cards</h4>
                <div className="space-y-2">
                  {selectedDispute.giftcards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{card.brand.icon}</span>
                        <span className="font-medium">{card.brand.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Reported: ${card.reportedAmount?.toFixed(2) || "N/A"}</span>
                        {card.reportedAmount && card.reportedAmount !== card.amount && (
                          <Badge variant="destructive" className="text-xs">
                            Diff: ${Math.abs(card.amount - card.reportedAmount).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Resolve Dispute</h4>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={resolution === "ACCEPTED" ? "default" : "outline"}
                    onClick={() => setResolution("ACCEPTED")}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    variant={resolution === "REJECTED" ? "destructive" : "outline"}
                    onClick={() => setResolution("REJECTED")}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add resolution notes..."
                    className="w-full p-3 border rounded-lg bg-background min-h-[80px]"
                  />
                </div>

                {/* Resolution explanation */}
                {resolution === "ACCEPTED" && selectedDispute.disputeType && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div className="font-medium mb-1">Resolution Action:</div>
                    {selectedDispute.disputeType === "OVERPAID" && selectedDispute.status !== "COMPLETED" && (
                      <p>Seller must refund the difference to admin.</p>
                    )}
                    {selectedDispute.disputeType === "OVERPAID" && selectedDispute.status === "COMPLETED" && (
                      <p>Seller refunds to admin, then admin refunds to buyer.</p>
                    )}
                    {selectedDispute.disputeType === "UNDERPAID" && selectedDispute.status !== "COMPLETED" && (
                      <p>Order confirmation will be cancelled. Buyer must re-confirm with correct amount.</p>
                    )}
                    {selectedDispute.disputeType === "UNDERPAID" && selectedDispute.status === "COMPLETED" && (
                      <p>Buyer refunds difference to admin, then admin pays seller.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isResolving} variant={resolution === "ACCEPTED" ? "default" : "destructive"}>
              {isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : resolution === "ACCEPTED" ? (
                "Accept Dispute"
              ) : (
                "Reject Dispute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
