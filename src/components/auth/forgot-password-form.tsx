"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle } from "lucide-react";
import { forgotPassword } from "@/actions";
import Form from "next/form";

type ForgotPasswordState = { error?: string; success?: boolean; email?: string } | null;

export function ForgotPasswordForm({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  const [state, formAction, isPending] = useActionState<ForgotPasswordState, FormData>(forgotPassword, null);

  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const authPath = `${portalPath}/auth`;

  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground text-sm">Enter your email to receive a password reset link</p>
        </div>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{state.error}</span>
          </Alert>
        )}

        {state?.success && (
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>If an account exists with that email, a reset link has been sent. Check your inbox.</span>
          </Alert>
        )}

        <Form action={formAction} className="space-y-4">
          <input type="hidden" name="portal" value={portal} />

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold opacity-70">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isPending || state?.success}
              className="bg-muted/50 border-none h-11"
            />
          </div>

          <Button type="submit" className="w-full h-11 font-semibold" disabled={isPending || state?.success}>
            {isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </Form>

        <p className="text-sm text-muted-foreground text-center">
          Remember your password?{" "}
          <Link href={`${authPath}/login`} className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
