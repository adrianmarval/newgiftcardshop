"use client";

import { useActionState, useState } from "react";
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
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your {portalLabels[portal].toLowerCase()} account settings</p>
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{state.error}</span>
        </Alert>
      )}

      {twoFactorError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{twoFactorError}</span>
        </Alert>
      )}

      {state?.success && (
        <Alert className="border-primary/50 bg-primary/5 text-primary">
          <CheckCircle className="h-4 w-4" />
          <span>Profile updated successfully!</span>
        </Alert>
      )}

      <div className="space-y-6">
        <Form action={formAction} className="space-y-6">
          {/* Personal Information */}
          <Card className="p-6 bg-muted/20 border-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Personal Information</h2>
                <p className="text-sm text-muted-foreground">Update your name and view your account details</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold opacity-70">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={user.name}
                  required
                  disabled={isPending}
                  className="bg-muted/50 border-none h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold opacity-70">
                  Email Address
                </Label>
                <Input id="email" type="email" value={user.email} disabled className="bg-muted/30 border-none h-11 opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
          </Card>

          {/* Password Change */}
          <Card className="p-6 bg-muted/20 border-none">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Security</h2>
                  <p className="text-sm text-muted-foreground">Manage your password and security settings</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-none bg-muted/30 hover:bg-muted/50"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? "Cancel" : "Change Password"}
              </Button>
            </div>

            {showPasswordFields && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs uppercase tracking-wider font-semibold opacity-70">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={isPending}
                    className="bg-muted/50 border-none h-11"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs uppercase tracking-wider font-semibold opacity-70">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="••••••••"
                      disabled={isPending}
                      className="bg-muted/50 border-none h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider font-semibold opacity-70">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      disabled={isPending}
                      className="bg-muted/50 border-none h-11"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Button type="submit" className="h-11 px-8 font-semibold" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </Form>

        {/* Two-Factor Authentication */}
        <Card className="p-6 bg-muted/20 border-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold italic flex items-center gap-2">
                  Two-Factor Authentication
                  {is2FAEnabled && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full not-italic">ENABLED</span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
            </div>

            {is2FAEnabled ? (
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none px-4 font-semibold"
                onClick={() => setShowDisableDialog(true)}
                disabled={is2FAPending}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button size="sm" className="h-9 px-4 font-semibold" onClick={() => setShow2FADialog(true)} disabled={is2FAPending}>
                Enable 2FA
              </Button>
            )}
          </div>
          {is2FAEnabled && (
            <div className="mt-4 pt-4 border-t border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Backup Codes</h3>
                  <p className="text-xs text-muted-foreground">Generate new codes if you&apos;ve used yours</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-none bg-muted/30 hover:bg-muted/50"
                    onClick={() => {
                      setShow2FADialog(true);
                      setTwoStepEnable(false);
                      setShowBackupCodes(false);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
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
              {showBackupCodes
                ? "Backup Codes"
                : !twoStepEnable
                ? "Set up Two-Factor Authentication"
                : "Scan QR Code"}
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
                <p className="text-sm text-muted-foreground">
                  Each code can be used only once. Keep them in a safe place.
                </p>
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
