"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle, User } from "lucide-react";
import { updateProfile } from "@/actions";
import { useAction } from "next-safe-action/hooks";
import type { ProfileInfoSectionProps } from "@/types";

export function ProfileInfoSection({ name, email }: ProfileInfoSectionProps) {
  const [nameValue, setNameValue] = useState(name);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { execute, status } = useAction(updateProfile, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
        setError(null);
        // Reset success message after a delay
        setTimeout(() => setSuccess(false), 3000);
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || error.validationErrors?._errors?.[0] || "Failed to update profile");
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    execute({ name: nameValue });
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-in bounce-in duration-300">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {success && (
        <Alert className="border-primary/50 bg-primary/10 text-primary animate-in zoom-in duration-300">
          <CheckCircle className="h-4 w-4" />
          <span>Profile updated successfully!</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 md:p-8 bg-card/60 backdrop-blur-sm border-border relative overflow-hidden group">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-3xl rounded-full" />

          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Personal Information</h2>
              <p className="text-base text-muted-foreground">General details for your account</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs md:text-sm uppercase tracking-widest font-black text-muted-foreground/80">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                disabled={status === "executing"}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="bg-muted/40 dark:bg-muted/50 border-border h-12 md:h-14 focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs md:text-sm uppercase tracking-widest font-black text-muted-foreground/80">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted/30 border-dashed border-border h-12 md:h-14 opacity-60 cursor-not-allowed italic font-medium"
              />
              <p className="text-xs text-muted-foreground/50 italic px-1">Verification required for changes</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground/70">Ensure your information is up to date.</p>
            </div>
            <Button
              type="submit"
              className="h-12 px-10 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all active:scale-95"
              disabled={status === "executing"}
            >
              {status === "executing" ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
