"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

function Verify2FAFormContent({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const portalPath = portal === "buy" ? "" : `/${portal}`;
  const dashboardPath = `${portalPath}/dashboard`;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
          portal,
          type: "two-factor",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      router.push(dashboardPath);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground text-sm">
            Enter the verification code sent to <br />
            <span className="font-semibold text-primary">{email}</span>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-wider font-semibold opacity-70">Enter 6-digit code</label>
            <InputOTP value={code} onChange={setCode} maxLength={6}>
              <InputOTPGroup className="flex justify-center gap-2">
                <InputOTPSlot index={0} className="h-12 w-12 bg-muted/50 border-none" />
                <InputOTPSlot index={1} className="h-12 w-12 bg-muted/50 border-none" />
                <InputOTPSlot index={2} className="h-12 w-12 bg-muted/50 border-none" />
                <InputOTPSlot index={3} className="h-12 w-12 bg-muted/50 border-none" />
                <InputOTPSlot index={4} className="h-12 w-12 bg-muted/50 border-none" />
                <InputOTPSlot index={5} className="h-12 w-12 bg-muted/50 border-none" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || code.length !== 6}>
            {loading ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}

export function Verify2FAForm({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Verify2FAFormContent portal={portal} />
    </Suspense>
  );
}
