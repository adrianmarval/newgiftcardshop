"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Check, X } from "lucide-react";
import { register } from "@/actions";
import { useAction } from "next-safe-action/hooks";
import type { RegisterFormProps } from "@/types";

function PasswordCheckItem({ valid, label }: { valid: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-base">
      {valid ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
      <span className={valid ? "text-green-600" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export function RegisterForm({ portal, loginUrl, title, subtitle }: RegisterFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const passwordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = password === confirmPassword;

  const portalValue = portal === "buyer" ? "buy" : "sell";
  const submitLabel = portal === "buyer" ? "Create Account" : "Create Seller Account";
  const signInText = portal === "buyer" ? "Already have an account?" : "Already have a seller account?";

  const { execute, status } = useAction(register, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || error.validationErrors?._errors?.[0] || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    execute({ fullName, email, password, confirmPassword, portal: portalValue });
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-base text-muted-foreground">{subtitle}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="portal" value={portalValue} />

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="John Doe"
              required
              disabled={status === "executing"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={status === "executing"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={status === "executing"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="space-y-2 mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Password requirements:</p>
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
              disabled={status === "executing"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={status === "executing" || !passwordValid || !passwordsMatch}>
            {status === "executing" ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Creating account...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </form>

        <p className="text-base text-muted-foreground text-center">
          {signInText}{" "}
          <Link href={loginUrl} className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
