"use client";

import { useState, Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Check, X } from "lucide-react";
import { resetPassword } from "@/actions";
import Form from "next/form";

function ResetPasswordFormContent({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, formAction, isPending] = useActionState(resetPassword, null);

  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const authPath = `${portalPath}/auth`;

  const [newPassword, setNewPassword] = useState("");
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewPassword(value);
    setPasswordChecks({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
    });
  };

  const allValid = Object.values(passwordChecks).every(Boolean);

  const PasswordCheckItem = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {valid ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
      <span className={valid ? "text-primary font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );

  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
        <div className="space-y-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm">This password reset link is invalid or has expired.</p>
          <Link href={`${authPath}/forgot-password`} className="text-primary hover:underline font-semibold text-sm">
            Request a new reset link
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-8 border-none shadow-none bg-transparent">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground text-sm">Create a new password for your account</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <Form action={formAction} className="space-y-4">
          <input type="hidden" name="portal" value={portal} />
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-xs uppercase tracking-wider font-semibold opacity-70">
              New Password
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={handlePasswordChange}
              required
              disabled={isPending}
              className="bg-muted/50 border-none h-11"
            />
            <div className="space-y-2 mt-2 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-semibold uppercase opacity-60">Requirements:</p>
              <div className="grid grid-cols-1 gap-1">
                <PasswordCheckItem valid={passwordChecks.length} label="At least 8 characters" />
                <PasswordCheckItem valid={passwordChecks.uppercase} label="Uppercase letter" />
                <PasswordCheckItem valid={passwordChecks.lowercase} label="Lowercase letter" />
                <PasswordCheckItem valid={passwordChecks.number} label="Number" />
                <PasswordCheckItem valid={passwordChecks.special} label="Special character" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider font-semibold opacity-70">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              className="bg-muted/50 border-none h-11"
            />
          </div>

          <Button type="submit" className="w-full h-11 font-semibold" disabled={isPending || !allValid}>
            {isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </Form>

        <p className="text-sm text-muted-foreground text-center">
          <Link href={`${authPath}/login`} className="text-primary hover:underline font-semibold">
            Back to Sign In
          </Link>
        </p>
      </div>
    </Card>
  );
}

export function ResetPasswordForm({ portal = "buy" }: { portal?: "admin" | "buy" | "sell" }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordFormContent portal={portal} />
    </Suspense>
  );
}
