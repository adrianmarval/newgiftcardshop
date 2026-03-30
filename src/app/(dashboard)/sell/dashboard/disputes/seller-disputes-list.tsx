"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Clock,
  Info,
  User,
  Loader2,
  MessageSquare
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { sellerResponseToDispute } from "@/actions/dispute-actions";
import type { Dispute } from "@/types";

interface SellerDisputesListProps {
  disputes: Dispute[];
}

export function SellerDisputesList({ disputes }: SellerDisputesListProps) {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [response, setResponse] = useState<"ACCEPT" | "REJECT" | null>(null);
  const [evidence, setEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingDisputes = disputes.filter((d) => d.disputeStatus === "PENDING");
  const resolvedDisputes = disputes.filter((d) => ["RESOLVED", "ACCEPTED", "REJECTED"].includes(d.disputeStatus));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="h-3 w-3 mr-1" /> Awaiting Response</Badge>;
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
    if (type === "OVERPAID") return "Buyer overpaid - You received more than expected";
    if (type === "UNDERPAID") return "Buyer underpaid - You received less than expected";
    return "Dispute";
  };

  const handleSubmitResponse = async () => {
    if (!selectedDispute || !response) return;
    
    setIsSubmitting(true);
    try {
      const result = await sellerResponseToDispute(
        selectedDispute.id, 
        response, 
        evidence
      );
      
      if (result.success) {
        // Close dialog and refresh
        setSelectedDispute(null);
        setResponse(null);
        setEvidence("");
        window.location.reload();
      } else {
        alert(result.error || "Failed to submit response");
      }
    } catch (error) {
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No disputes</h3>
          <p className="text-muted-foreground text-center mt-2">
            You don't have any disputes on your orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Pending Disputes - Requires Seller Response */}
        {pendingDisputes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Requires Your Response ({pendingDisputes.length})
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

                    {/* Buyer Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <User className="h-4 w-4" />
                      Buyer: {dispute.user?.name || "Unknown"} ({dispute.user?.email || "Unknown"})
                    </div>

                    {/* Your Cards */}
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground uppercase mb-2">Your Cards in This Order</div>
                      <div className="space-y-1">
                        {dispute.giftcards.map((card) => (
                          <div key={card.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span>{card.brand.icon}</span>
                              <span>{card.brand.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Listed: ${card.amount.toFixed(2)}
                              </span>
                              {card.reportedAmount !== null && card.reportedAmount !== card.amount && (
                                <>
                                  <span>→</span>
                                  <span className={card.reportedAmount < card.amount ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                                    Buyer reported: ${card.reportedAmount.toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm bg-muted/50 p-3 rounded-lg mb-3">
                      <div>
                        <div className="text-muted-foreground text-xs">Order Total</div>
                        <div className="font-semibold">${dispute.total.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Buyer Confirmed</div>
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
                      <div className="text-sm mb-3 bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
                        <span className="text-destructive font-medium">Buyer's Reason: </span>
                        {dispute.disputeReason}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-green-500 text-green-500 hover:bg-green-500/10"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setResponse("ACCEPT");
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Accept (I agree)
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setResponse("REJECT");
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject (Dispute)
                      </Button>
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
                      <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
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

      {/* Response Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {response === "ACCEPT" ? "Accept Dispute" : "Reject Dispute"}
            </DialogTitle>
            <DialogDescription>
              Order #{selectedDispute?.id.slice(-8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {response === "ACCEPT" ? (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">You accept the dispute</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  By accepting, you agree that the buyer&apos;s report is correct. 
                  An admin will process the refund accordingly.
                </p>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">You reject the dispute</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  By rejecting, you&apos;re stating the buyer&apos;s report is incorrect. 
                  An admin will review the case.
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                {response === "REJECT" ? "Provide evidence or reason (required)" : "Additional notes (optional)"}
              </label>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder={
                  response === "REJECT" 
                    ? "Explain why you reject the dispute, provide screenshots, etc..."
                    : "Any additional notes..."
                }
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
                required={response === "REJECT"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitResponse}
              disabled={isSubmitting || (response === "REJECT" && !evidence.trim())}
              variant={response === "ACCEPT" ? "default" : "destructive"}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                response === "ACCEPT" ? "Confirm Acceptance" : "Submit Dispute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
