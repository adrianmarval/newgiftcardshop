"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import { login } from "@/actions";
import Form from "next/form";
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
  const [error, formAction, isPending] = useActionState(login, null);

  // Map the portal prop to the value the server action expects
  const portalValue = portal === "buyer" ? "buy" : portal === "seller" ? "sell" : "admin";

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <Form action={formAction} className="space-y-4">
          <input type="hidden" name="portal" value={portalValue} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={emailPlaceholder}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href={forgotPasswordUrl} className="text-xs text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </Form>

        {registerUrl && (
          <p className="text-sm text-muted-foreground">
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
