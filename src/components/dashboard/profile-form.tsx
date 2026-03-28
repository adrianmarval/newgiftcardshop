"use client";

import { useState, useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle, User, Lock, ShieldCheck, QrCode, Copy, Check, RefreshCw } from "lucide-react";
import { updateProfile } from "@/actions";
import Form from "next/form";
import { authClient } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

type ProfileState = { error?: string; success?: boolean } | null;

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    twoFactorEnabled: boolean;
  };
  portal: "admin" | "buy" | "sell";
}

export function ProfileForm({ user, portal }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(updateProfile, null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // 2FA States
  const [is2FAEnabled, setIs2FAEnabled] = useState(user.twoFactorEnabled);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoStepEnable, setTwoStepEnable] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [password, setPassword] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const portalLabels = {
    admin: "Admin",
    sell: "Seller",
    buy: "Buyer",
  };

  const handleEnable2FA = async () => {
    if (!password) {
      setTwoFactorError("Password is required to enable 2FA");
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.enable({
        password,
      });
      if (error) {
        console.log("Error enabling 2FA:", error);
        setTwoFactorError(error.message || "Failed to enable 2FA");
      } else if (data) {
        setQrCodeData(data.totpURI);
        setTwoStepEnable(true);
        setBackupCodes(data.backupCodes); // Capture initial backup codes
        setPassword(""); // Clear password after success
      }
    } catch (err) {
      setTwoFactorError("An unexpected error occurred");
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleVerify2FA = async () => {
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.verifyTotp({
        code: totpCode,
      });
      if (error) {
        setTwoFactorError(error.message || "Invalid code");
      } else {
        setIs2FAEnabled(true);
        const codes = (data as any)?.backupCodes;
        if (codes) {
          setBackupCodes(codes);
        }
        setShowBackupCodes(true); // Show backup codes after successful verification
        setTotpCode("");
      }
    } catch (err) {
      setTwoFactorError("An unexpected error occurred");
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!password) {
      setTwoFactorError("Password is required to regenerate backup codes");
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({
        password,
      });
      if (error) {
        setTwoFactorError(error.message || "Failed to regenerate codes");
      } else if (data) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setPassword("");
      }
    } catch (err) {
      setTwoFactorError("An unexpected error occurred");
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      setTwoFactorError("Password is required to disable 2FA");
      return;
    }

    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { error } = await authClient.twoFactor.disable({
        password,
      });
      if (error) {
        setTwoFactorError(error.message || "Failed to disable 2FA");
      } else {
        setIs2FAEnabled(false);
        setShowDisableDialog(false);
        setPassword("");
      }
    } catch (err) {
      setTwoFactorError("An unexpected error occurred");
    } finally {
      setIs2FAPending(false);
    }
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 px-0 md:px-0 py-2 md:py-0">
      {/* Header & Progress combined */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-card/40 px-3 py-4 md:p-6 rounded-none md:rounded-xl border-y md:border border-border backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold mb-0.5 md:mb-1">Profile Settings</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Manage your {portalLabels[portal].toLowerCase()} account settings and security preferences.
          </p>
        </motion.div>
      </div>
      {/* <div className="space-y-1.5 md:space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground bg-clip-text">
          Profile Settings
        </h1>
        <p className="text-muted-foreground text-sm md:text-base font-medium">
          Manage your {portalLabels[portal].toLowerCase()} account settings and security preferences.
        </p>
      </div> */}

      {state?.error && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-in bounce-in duration-300">
          <AlertCircle className="h-4 w-4" />
          <span>{state.error}</span>
        </Alert>
      )}

      {twoFactorError && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-in bounce-in duration-300">
          <AlertCircle className="h-4 w-4" />
          <span>{twoFactorError}</span>
        </Alert>
      )}

      {state?.success && (
        <Alert className="border-primary/50 bg-primary/10 text-primary animate-in zoom-in duration-300">
          <CheckCircle className="h-4 w-4" />
          <span>Profile updated successfully!</span>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Personal Information */}
        <div className="lg:col-span-7 space-y-6">
          <Form action={formAction} className="space-y-6">
            <Card className="p-5 md:p-8 bg-card/60 backdrop-blur-sm border-border relative overflow-hidden group">
              {/* Subtle background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-3xl rounded-full" />

              <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Personal Information</h2>
                  <p className="text-sm text-muted-foreground">General details for your account</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] md:text-xs uppercase tracking-widest font-black text-muted-foreground/80">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={user.name}
                    required
                    disabled={isPending}
                    className="bg-muted/40 dark:bg-muted/50 border-border h-12 md:h-14 focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] md:text-xs uppercase tracking-widest font-black text-muted-foreground/80">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted/30 border-dashed border-border h-12 md:h-14 opacity-60 cursor-not-allowed italic font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground/50 italic px-1">Verification required for changes</p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground/70">Ensure your information is up to date.</p>
                </div>
                <Button
                  type="submit"
                  className="h-12 px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all active:scale-95"
                  disabled={isPending}
                >
                  {isPending ? (
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
          </Form>
        </div>

        {/* Right Column: Security & 2FA */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security Card */}
          <Card className="p-5 md:p-8 bg-card/60 backdrop-blur-sm border-border relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Security</h2>
                  <p className="text-sm text-muted-foreground">Access management</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`border-border transition-all font-bold text-[10px] uppercase tracking-wider px-4 ${showPasswordFields ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" : "bg-muted/40 hover:bg-muted/60"}`}
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? "Cancel" : "Modify Password"}
              </Button>
            </div>

            <AnimatePresence>
              {showPasswordFields && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/80">
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      placeholder="••••••••"
                      disabled={isPending}
                      className="bg-muted/40 dark:bg-muted/50 border-border h-12 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/80">
                        New Password
                      </Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        placeholder="••••••••"
                        disabled={isPending}
                        className="bg-muted/40 dark:bg-muted/50 border-border h-12 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                        className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/80"
                      >
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        disabled={isPending}
                        className="bg-muted/40 dark:bg-muted/50 border-border h-12 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground/50 italic">
                      Password must be at least 8 characters long with numbers and symbols.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showPasswordFields && (
              <div className="h-6 flex items-center">
                <p className="text-xs text-muted-foreground/40 italic">Password fields are hidden for your protection.</p>
              </div>
            )}
          </Card>

          {/* Two-Factor Authentication Card */}
          <Card className="p-5 md:p-8 bg-card/60 backdrop-blur-sm border-border relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-primary transition-colors">
                    2FA
                    {is2FAEnabled && (
                      <span className="text-[8px] bg-primary/20 text-primary px-3 py-1 rounded-full font-black tracking-widest uppercase">
                        ACTIVE
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">Identity verification</p>
                </div>
              </div>

              {is2FAEnabled ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/10 transition-all font-bold px-4"
                  onClick={() => setShowDisableDialog(true)}
                  disabled={is2FAPending}
                >
                  Disable
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="px-6 font-bold shadow-lg shadow-primary/10 active:scale-95"
                  onClick={() => setShow2FADialog(true)}
                  disabled={is2FAPending}
                >
                  Configure
                </Button>
              )}
            </div>

            {is2FAEnabled && (
              <div className="mt-8 pt-8 border-t border-border flex items-center justify-between group/codes">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/80">Backup Codes</h3>
                  <p className="text-xs text-muted-foreground/60">Generate extra recovery keys</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-border bg-muted/20 hover:bg-muted/40 transition-all font-semibold px-4 group-hover/codes:border-primary/30"
                  onClick={() => {
                    setShow2FADialog(true);
                    setTwoStepEnable(false);
                    setShowBackupCodes(false);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2 group-hover/codes:rotate-180 transition-transform duration-500" />
                  Manage
                </Button>
              </div>
            )}

            {!is2FAEnabled && (
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] leading-relaxed text-primary/80 font-medium">
                  We highly recommend enabling 2FA. This adds an extra shield to your transactions and personal data within the Solmaira
                  ecosystem.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog
        open={show2FADialog}
        onOpenChange={(open) => {
          setShow2FADialog(open);
          if (!open) {
            setTwoStepEnable(false);
            setQrCodeData("");
            setTotpCode("");
            setTwoFactorError("");
            setPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {showBackupCodes ? "Backup Codes" : !twoStepEnable ? "Set up Two-Factor Authentication" : "Scan QR Code"}
            </DialogTitle>
            <DialogDescription>
              {showBackupCodes
                ? "Save these codes in a safe place. They are the only way to recover your account if you lose your device."
                : !twoStepEnable
                  ? "Protect your account with a secondary verification method."
                  : "Scan the QR code with your authenticator app and enter the code."}
            </DialogDescription>
          </DialogHeader>

          {showBackupCodes ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold">Your Backup Codes</h3>
                <p className="text-sm text-muted-foreground">Each code can be used only once. Keep them in a safe place.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted/50 rounded-xl font-mono text-sm border">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between p-1">
                    <span>{code}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => {
                    const text = backupCodes.join("\n");
                    navigator.clipboard.writeText(text);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Codes
                </Button>
                <Button
                  onClick={() => {
                    setShow2FADialog(false);
                    setShowBackupCodes(false);
                    setTwoStepEnable(false);
                    setQrCodeData("");
                  }}
                  className="w-full h-11 font-semibold"
                >
                  I&apos;ve Saved These Codes
                </Button>
              </div>
            </div>
          ) : !twoStepEnable ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {is2FAEnabled ? <RefreshCw className="h-8 w-8 text-primary" /> : <ShieldCheck className="h-8 w-8 text-primary" />}
                </div>
                <p className="text-sm">
                  {is2FAEnabled
                    ? "Verify your password to generate a new set of backup codes."
                    : "We highly recommend enabling 2FA to keep your gift card portal secure."}
                </p>
              </div>

              <div className="space-y-2">
                {twoFactorError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{twoFactorError}</span>
                  </Alert>
                )}
                <Label htmlFor="setupPassword" title="Verify your password to continue">
                  Password
                </Label>
                <Input
                  id="setupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="bg-muted/50 border-none h-11"
                />
              </div>

              {is2FAEnabled ? (
                <Button onClick={handleRegenerateBackupCodes} className="w-full h-11 font-semibold" disabled={is2FAPending || !password}>
                  {is2FAPending && <Spinner className="h-4 w-4 mr-2" />}
                  Regenerate Backup Codes
                </Button>
              ) : (
                <Button onClick={handleEnable2FA} className="w-full h-11 font-semibold" disabled={is2FAPending || !password}>
                  {is2FAPending && <Spinner className="h-4 w-4 mr-2" />}
                  Enable Authenticator
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-xl">{qrCodeData && <QRCodeSVG value={qrCodeData} size={200} />}</div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono break-all text-center">{qrCodeData}</p>
              </div>

              <div className="space-y-2">
                {twoFactorError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{twoFactorError}</span>
                  </Alert>
                )}
                <Label htmlFor="totpCode" className="text-xs uppercase tracking-wider font-semibold opacity-70">
                  Verification Code
                </Label>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="bg-muted/50 border-none h-11 text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>

              <Button onClick={handleVerify2FA} className="w-full h-11" disabled={is2FAPending || totpCode.length !== 6}>
                {is2FAPending ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Verify and Activate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog
        open={showDisableDialog}
        onOpenChange={(open) => {
          setShowDisableDialog(open);
          if (!open) {
            setPassword("");
            setTwoFactorError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>Are you sure you want to disable 2FA? This will make your account less secure.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">Account Password</Label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirm your password"
                className="bg-muted/50 border-none h-11"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              className="w-full h-11 font-semibold"
              disabled={is2FAPending || !password}
            >
              {is2FAPending ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Disable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
