"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Check, X } from "lucide-react";
import { register } from "@/actions";
import Form from "next/form";

function PasswordCheckItem({ valid, label }: { valid: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {valid ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
      <span className={valid ? "text-green-600" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export function BuyerRegisterForm() {
  const [error, formAction, isPending] = useActionState(register, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const passwordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = password === confirmPassword;

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground">Sign up to start buying gift cards at great prices</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <Form action={formAction} className="space-y-4">
          <input type="hidden" name="portal" value="buy" />

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" placeholder="John Doe" required disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="space-y-2 mt-2 p-3 bg-muted rounded-md">
              <p className="text-xs font-medium">Password requirements:</p>
              <PasswordCheckItem valid={checks.length} label="At least 8 characters" />
              <PasswordCheckItem valid={checks.uppercase} label="Uppercase letter" />
              <PasswordCheckItem valid={checks.lowercase} label="Lowercase letter" />
              <PasswordCheckItem valid={checks.number} label="Number" />
              <PasswordCheckItem valid={checks.special} label="Special character" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !passwordValid || !passwordsMatch}>
            {isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </Form>

        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link href="/buy/auth/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
