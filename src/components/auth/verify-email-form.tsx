"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { verifyEmail, resendVerification } from "@/actions";
import { useAction } from "next-safe-action/hooks";
import { Suspense } from "react";
import type { Portal } from "@/types";

function VerifyEmailFormContent({ portal = "buy" }: { portal?: Portal }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { execute: verifyExecute, status: verifyStatus } = useAction(verifyEmail, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || error.validationErrors?._errors?.[0] || "Verification failed");
    },
  });

  const { execute: resendExecute, status: resendStatus } = useAction(resendVerification, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setResendSuccess(true);
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || error.validationErrors?._errors?.[0] || "Failed to resend verification");
    },
  });

  // If we have a token, show verify button
  if (token) {
    const handleVerify = () => {
      setError(null);
      verifyExecute({ portal, token });
    };

    return (
      <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">Verify Your Email</h1>
            <p className="text-base text-muted-foreground">Click below to complete your email verification</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}

          <div className="space-y-4">
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="token" value={token} />

            <Button
              type="button"
              onClick={handleVerify}
              className="w-full h-11 font-semibold"
              disabled={verifyStatus === "executing"}
            >
              {verifyStatus === "executing" ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // If no token, show pending verification state with resend option
  const handleResend = () => {
    setError(null);
    setResendSuccess(false);
    resendExecute({ portal, email });
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <Mail className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Check Your Email</h1>
          <p className="text-base text-muted-foreground">
            We&apos;ve sent a verification link to<br />
            {email && <span className="font-semibold text-primary">{email}</span>}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {resendSuccess && (
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>Verification email resent! Check your inbox.</span>
          </Alert>
        )}

        {email && (
          <div>
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="email" value={email} />

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              className="w-full h-11 border-none bg-muted/30 hover:bg-muted/50 font-medium"
              disabled={resendStatus === "executing"}
            >
              {resendStatus === "executing" ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Resending...
                </>
              ) : (
                "Didn't receive email? Resend"
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function VerifyEmailForm({ portal = "buy" }: { portal?: Portal }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailFormContent portal={portal} />
    </Suspense>
  );
}
