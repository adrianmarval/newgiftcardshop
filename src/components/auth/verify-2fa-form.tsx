"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ShieldCheck, AlertCircle, Laptop, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Verify2FAFormProps {
  portal: "buy" | "sell" | "admin";
}

const dashboardMap = {
  sell: "/sell/dashboard",
  buy: "/buy/dashboard",
  admin: "/admin/dashboard",
} as const;

export function Verify2FAForm({ portal }: Verify2FAFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const portalNames = {
    buy: "Buyer",
    sell: "Seller",
    admin: "Admin",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRecoveryMode && code.length !== 6) return;
    if (isRecoveryMode && !code) return;

    setIsPending(true);
    setError(null);

    try {
      if (isRecoveryMode) {
        const { error: authError } = await authClient.twoFactor.verifyBackupCode({
          code: code,
        });

        if (authError) {
          setError(authError.message || "Invalid backup code");
          setIsPending(false);
          return;
        }
      } else {
        const { error: authError } = await authClient.twoFactor.verifyTotp({
          code: code,
          trustDevice: trustDevice,
        });

        if (authError) {
          setError(authError.message || "Invalid verification code");
          setIsPending(false);
          return;
        }
      }

      // Successful verification
      router.push(dashboardMap[portal]);
      router.refresh();
    } catch (err) {
      console.error("2FA verification error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8 text-center">
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-full">
            {isRecoveryMode ? <KeyRound className="h-8 w-8 text-primary" /> : <ShieldCheck className="h-8 w-8 text-primary" />}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{isRecoveryMode ? "2FA Recovery" : "Two-Factor Authentication"}</h1>
          <p className="text-muted-foreground text-sm">
            {isRecoveryMode
              ? "Enter one of your backup codes to access your account."
              : `Please enter the 6-digit code from your authenticator app to verify your ${portalNames[portal]} account.`}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center py-4">
            {isRecoveryMode ? (
              <Input
                placeholder="Enter backup code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center font-mono uppercase tracking-wider h-12"
                disabled={isPending}
                autoFocus
              />
            ) : (
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isPending}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="rounded-md border-2" />
                  <InputOTPSlot index={1} className="rounded-md border-2" />
                  <InputOTPSlot index={2} className="rounded-md border-2" />
                  <InputOTPSlot index={3} className="rounded-md border-2" />
                  <InputOTPSlot index={4} className="rounded-md border-2" />
                  <InputOTPSlot index={5} className="rounded-md border-2" />
                </InputOTPGroup>
              </InputOTP>
            )}
          </div>

          {!isRecoveryMode && (
            <div className="flex items-center space-x-2 border rounded-lg p-3 bg-muted/30">
              <Checkbox
                id="trust"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
                disabled={isPending}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="trust" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                  <Laptop className="h-3.5 w-3.5" />
                  Trust this device
                </Label>
                <p className="text-xs text-muted-foreground">Don't ask for a code again on this browser for 30 days.</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-lg font-semibold"
            disabled={isPending || (isRecoveryMode ? !code : code.length !== 6)}
          >
            {isPending ? (
              <>
                <Spinner className="mr-2 h-5 w-5" />
                Verifying...
              </>
            ) : isRecoveryMode ? (
              "Verify Backup Code"
            ) : (
              "Verify Code"
            )}
          </Button>
        </form>

        <div className="space-y-2">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-primary hover:underline font-medium p-0 h-auto"
            onClick={() => {
              setIsRecoveryMode(!isRecoveryMode);
              setCode("");
              setError(null);
            }}
            disabled={isPending}
          >
            {isRecoveryMode ? "Use authenticator app" : "Lost access? Use a backup code"}
          </Button>
          <p className="text-xs text-muted-foreground block">If you&apos;re having trouble, please contact support.</p>
        </div>
      </div>
    </Card>
  );
}
