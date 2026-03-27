"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { verifyEmail, resendVerification } from "@/actions";
import Form from "next/form";
import { Suspense } from "react";

type ResendState = { error?: string; success?: boolean } | null;

function VerifyEmailFormContent({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [error, verifyAction, isVerifying] = useActionState(verifyEmail, null);
  const [resendState, resendAction, isResending] = useActionState<ResendState, FormData>(resendVerification, null);

  // If we have a token, show verify button
  if (token) {
    return (
      <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Verify Your Email</h1>
            <p className="text-muted-foreground text-sm">Click below to complete your email verification</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}

          <Form action={verifyAction} className="space-y-4">
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="token" value={token} />

            <Button type="submit" className="w-full h-11 font-semibold" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </Form>
        </div>
      </Card>
    );
  }

  // If no token, show pending verification state with resend option
  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <Mail className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground text-sm">
            We&apos;ve sent a verification link to<br />
            {email && <span className="font-semibold text-primary">{email}</span>}
          </p>
        </div>

        {resendState?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{resendState.error}</span>
          </Alert>
        )}

        {resendState?.success && (
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>Verification email resent! Check your inbox.</span>
          </Alert>
        )}

        {email && (
          <Form action={resendAction}>
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="email" value={email} />

            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 border-none bg-muted/30 hover:bg-muted/50 font-medium"
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Resending...
                </>
              ) : (
                "Didn't receive email? Resend"
              )}
            </Button>
          </Form>
        )}
      </div>
    </Card>
  );
}

export function VerifyEmailForm({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailFormContent portal={portal} />
    </Suspense>
  );
}
