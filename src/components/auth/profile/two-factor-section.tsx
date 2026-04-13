"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ShieldCheck, Copy, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import type { TwoFactorSectionProps } from "@/types";

export function TwoFactorSection({ initialEnabled }: TwoFactorSectionProps) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(initialEnabled);

  // Setup dialog state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoStepEnable, setTwoStepEnable] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Disable dialog state
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Shared state
  const [password, setPassword] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false);

  const handleEnable2FA = async () => {
    if (!password) {
      setTwoFactorError("Password is required to enable 2FA");
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) {
        console.log("Error enabling 2FA:", error);
        setTwoFactorError(error.message || "Failed to enable 2FA");
      } else if (data) {
        setQrCodeData(data.totpURI);
        setTwoStepEnable(true);
        setBackupCodes(data.backupCodes);
        setPassword("");
      }
    } catch (err) {
      console.log(err);
      setTwoFactorError("An unexpected error occurred");
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleVerify2FA = async () => {
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.verifyTotp({ code: totpCode });
      if (error) {
        setTwoFactorError(error.message || "Invalid code");
      } else {
        setIs2FAEnabled(true);
        const responseData = data as { backupCodes?: string[] } | null;
        const codes = responseData?.backupCodes;
        if (codes) {
          setBackupCodes(codes);
        }
        setShowBackupCodes(true);
        setTotpCode("");
      }
    } catch (err) {
      console.log(err);
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
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error) {
        setTwoFactorError(error.message || "Failed to regenerate codes");
      } else if (data) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setPassword("");
      }
    } catch (err) {
      console.log(err);
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
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        setTwoFactorError(error.message || "Failed to disable 2FA");
      } else {
        setIs2FAEnabled(false);
        setShowDisableDialog(false);
        setPassword("");
      }
    } catch (err) {
      console.log(err);
      setTwoFactorError("An unexpected error occurred");
    } finally {
      setIs2FAPending(false);
    }
  };

  const handleClose2FADialog = (open: boolean) => {
    setShow2FADialog(open);
    if (!open) {
      setTwoStepEnable(false);
      setQrCodeData("");
      setTotpCode("");
      setTwoFactorError("");
      setPassword("");
    }
  };

  const handleCloseDisableDialog = (open: boolean) => {
    setShowDisableDialog(open);
    if (!open) {
      setPassword("");
      setTwoFactorError("");
    }
  };

  return (
    <>
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
                  <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-black tracking-widest uppercase">
                    ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-base text-muted-foreground">Identity verification</p>
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
              <h3 className="text-xs uppercase tracking-widest font-black text-muted-foreground/80">Backup Codes</h3>
              <p className="text-sm text-muted-foreground/60">Generate extra recovery keys</p>
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
              <p className="text-xs leading-relaxed text-primary/80 font-medium">
                We highly recommend enabling 2FA. This adds an extra shield to your transactions and personal data within the Solmaira
                ecosystem.
              </p>
          </div>
        )}
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent className="sm:max-w-106.25">
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
                <h3 className="text-xl font-bold">Your Backup Codes</h3>
                <p className="text-base text-muted-foreground">Each code can be used only once. Keep them in a safe place.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted/50 rounded-xl font-mono text-base border">
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
                <p className="text-base">
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
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono break-all text-center">{qrCodeData}</p>
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
      <Dialog open={showDisableDialog} onOpenChange={handleCloseDisableDialog}>
        <DialogContent className="sm:max-w-106.25">
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
    </>
  );
}
