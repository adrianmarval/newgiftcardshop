"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { verify2FA } from "@/actions";
import Form from "next/form";
import { Suspense, useState } from "react";

function Verify2FAFormContent({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [code, setCode] = useState("");
  const [error, formAction, isPending] = useActionState(verify2FA, null);

  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground text-sm">
            Enter the verification code from your authenticator app
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <Form action={formAction} className="space-y-6">
          <input type="hidden" name="portal" value={portal} />
          <input type="hidden" name="code" value={code} />

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

          <Button type="submit" className="w-full h-11 font-semibold" disabled={isPending || code.length !== 6}>
            {isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </Button>
        </Form>
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
