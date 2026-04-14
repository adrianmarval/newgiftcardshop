"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle } from "lucide-react";
import { forgotPassword } from "@/actions";
import { useAction } from "next-safe-action/hooks";

export function ForgotPasswordForm({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const authPath = `${portalPath}/auth`;

  const { execute, status } = useAction(forgotPassword, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
        setError(null);
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || error.validationErrors?._errors?.[0] || "Failed to send reset link");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    execute({ email, portal });
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-base text-muted-foreground">Enter your email to receive a password reset link</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>If an account exists with that email, a reset link has been sent. Check your inbox.</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="portal" value={portal} />

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm uppercase tracking-wider font-semibold opacity-70">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={status === "executing" || success}
              className="bg-muted/50 border-none h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full h-11 font-semibold" disabled={status === "executing" || success}>
            {status === "executing" ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        <p className="text-base text-muted-foreground text-center">
          Remember your password?{" "}
          <Link href={`${authPath}/login`} className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
