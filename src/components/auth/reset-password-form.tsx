"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AlertCircle, Check, X } from "lucide-react";
import { Suspense } from "react";

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [stage, setStage] = useState<"otp" | "password">("otp");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const handleOtpVerify = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
          type: "password-reset",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setStage("password");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordValid = Object.values(passwordChecks).every(Boolean);
    if (!passwordValid) {
      setError("Password does not meet all requirements");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Password reset failed");
        return;
      }

      router.push("/auth/login?reset=success");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const PasswordCheckItem = ({
    valid,
    label,
  }: {
    valid: boolean;
    label: string;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {valid ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={valid ? "text-green-600" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            {stage === "otp"
              ? "Enter the verification code sent to your email"
              : "Create a new password for your account"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {stage === "otp" ? (
          <form onSubmit={handleOtpVerify} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Enter verification code
              </label>
              <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                <InputOTPGroup className="flex justify-center gap-2">
                  <InputOTPSlot index={0} className="h-12 w-12" />
                  <InputOTPSlot index={1} className="h-12 w-12" />
                  <InputOTPSlot index={2} className="h-12 w-12" />
                  <InputOTPSlot index={3} className="h-12 w-12" />
                  <InputOTPSlot index={4} className="h-12 w-12" />
                  <InputOTPSlot index={5} className="h-12 w-12" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
              />
              <div className="space-y-2 mt-2 p-3 bg-muted rounded-md">
                <p className="text-xs font-medium">Password requirements:</p>
                <PasswordCheckItem
                  valid={passwordChecks.length}
                  label="At least 8 characters"
                />
                <PasswordCheckItem
                  valid={passwordChecks.uppercase}
                  label="Uppercase letter"
                />
                <PasswordCheckItem
                  valid={passwordChecks.lowercase}
                  label="Lowercase letter"
                />
                <PasswordCheckItem
                  valid={passwordChecks.number}
                  label="Number"
                />
                <PasswordCheckItem
                  valid={passwordChecks.special}
                  label="Special character"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                newPassword !== confirmPassword ||
                !Object.values(passwordChecks).every(Boolean)
              }
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
