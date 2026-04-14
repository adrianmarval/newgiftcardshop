"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import { login } from "@/actions";
import type { LoginFormProps } from "@/types";

export function LoginForm({
  portal,
  title,
  subtitle,
  forgotPasswordUrl,
  emailPlaceholder = "you@example.com",
  registerUrl,
  registerPrompt = "Don't have an account?",
  registerLinkText = "Sign up",
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Map the portal prop to the value the server action expects
  const portalValue = portal === "buyer" ? "buy" : portal === "seller" ? "sell" : "admin";

  const { execute, status } = useAction(login, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || error.validationErrors?._errors?.[0] || "Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    execute({ email, password, portal: portalValue });
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={emailPlaceholder}
              required
              disabled={status === "executing"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href={forgotPasswordUrl} className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
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
          </div>

          <Button type="submit" className="w-full" disabled={status === "executing"}>
            {status === "executing" ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {registerUrl && (
          <p className="text-base text-muted-foreground">
            {registerPrompt}{" "}
            <Link href={registerUrl} className="text-primary hover:underline font-medium">
              {registerLinkText}
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
