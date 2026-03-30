"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisputeDetails, resolveDispute } from "@/actions/dispute-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, Eye, Loader2, Clock, User, AlertTriangle, Shield } from "lucide-react";
import type { DisputeDetails } from "@/types";

interface DisputesListProps {
  initialDisputes: DisputeDetails[];
}

export function DisputesList({ initialDisputes }: DisputesListProps) {
  const [disputes] = useState(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolution, setResolution] = useState<"ACCEPTED" | "REJECTED">("ACCEPTED");
  const [notes, setNotes] = useState("");

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
        // Refresh the page to show updated status
        window.location.reload();
      }
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "ACCEPTED":
        return <Badge variant="outline" className="border-green-500 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="border-red-500 text-red-500"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><Shield className="h-3 w-3 mr-1" /> Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  // Group disputes by status
  const pendingDisputes = disputes.filter(d => d.disputeStatus === "PENDING");
  const resolvedDisputes = disputes.filter(d => d.disputeStatus !== "PENDING");

  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No disputes</h3>
          <p className="text-muted-foreground text-center mt-2">All order amount discrepancies have been resolved.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Pending Disputes */}
        {pendingDisputes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Resolution ({pendingDisputes.length})
            </h2>
            <div className="grid gap-4">
              {pendingDisputes.map((dispute) => (
                <Card key={dispute.id} className="border-yellow-500/30 hover:bg-muted/50 transition-colors">
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
                              Review
                            </>
                          )}
                        </Button>
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
                      <div className="flex items-center gap-4">
                        {getDisputeTypeIcon(dispute.disputeType)}
                        <div>
                          <div className="font-mono text-sm">Order #{dispute.id.slice(-8)}</div>
                          <div className="text-sm text-muted-foreground">
                            {dispute.user?.name || "Unknown"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {getStatusBadge(dispute.disputeStatus)}
                        <div className="text-right">
                          <div className="font-semibold">${Math.abs(dispute.disputeDifference || 0).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">difference</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(dispute.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                    {dispute.disputeNotes && (
                      <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {dispute.disputeNotes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Dispute Details
              {selectedDispute && getStatusBadge(selectedDispute.disputeStatus)}
            </DialogTitle>
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
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Buyer
                </h4>
                <div className="text-sm bg-muted/50 p-3 rounded-lg">
                  <div>{selectedDispute.user?.name || "Unknown"}</div>
                  <div className="text-muted-foreground">{selectedDispute.user?.email || "Unknown"}</div>
                </div>
              </div>

              {/* Dispute Info */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Dispute Information
                </h4>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Type: </span>
                    {getDisputeTypeBadge(selectedDispute.disputeType)}
                  </div>
                  {selectedDispute.disputeReason && (
                    <div className="text-sm bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
                      <span className="text-destructive font-medium">Buyer's Reason: </span>
                      {selectedDispute.disputeReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Response */}
              {selectedDispute.disputeNotes && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Seller Response
                  </h4>
                  <div className="text-sm bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                    {selectedDispute.disputeNotes}
                  </div>
                </div>
              )}

              {/* Giftcards */}
              <div>
                <h4 className="font-semibold mb-2">Gift Cards in Dispute</h4>
                <div className="space-y-2">
                  {selectedDispute.giftcards?.map((card) => (
                    <div key={card.id} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{card.brand?.icon}</span>
                        <span className="font-medium">{card.brand?.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Listed: ${card.amount?.toFixed(2)}
                        </span>
                        {card.reportedAmount && card.reportedAmount !== card.amount && (
                          <>
                            <span>→</span>
                            <span className={card.reportedAmount < card.amount ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                              Reported: ${card.reportedAmount?.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Resolution (only for PENDING) */}
              {selectedDispute.disputeStatus === "PENDING" && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Resolution
                  </h4>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg mb-4">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> If the seller has not responded, you can resolve this dispute based on the evidence provided by the buyer. 
                      The seller will need to comply with the resolution.
                    </p>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={resolution === "ACCEPTED" ? "default" : "outline"}
                      onClick={() => setResolution("ACCEPTED")}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accept (Favor Buyer)
                    </Button>
                    <Button
                      variant={resolution === "REJECTED" ? "destructive" : "outline"}
                      onClick={() => setResolution("REJECTED")}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject (Favor Seller)
                    </Button>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain the resolution decision..."
                      className="w-full p-3 border rounded-lg bg-background min-h-[80px]"
                    />
                  </div>

                  {/* Resolution explanation */}
                  <div className="bg-muted p-3 rounded-lg text-sm mb-4">
                    <div className="font-medium mb-1">Resolution Action:</div>
                    {selectedDispute.disputeType === "OVERPAID" && (
                      <p>Seller refunds difference to admin, then admin refunds to buyer.</p>
                    )}
                    {selectedDispute.disputeType === "UNDERPAID" && (
                      <p>Buyer refunds difference to admin, then admin pays seller.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Close
            </Button>
            {selectedDispute?.disputeStatus === "PENDING" && (
              <Button
                onClick={handleResolve}
                disabled={isResolving}
                variant={resolution === "ACCEPTED" ? "default" : "destructive"}
              >
                {isResolving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  resolution === "ACCEPTED" ? "Resolve - Accept Dispute" : "Resolve - Reject Dispute"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
