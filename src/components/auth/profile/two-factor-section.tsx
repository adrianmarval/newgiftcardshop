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
import { usePathname } from "next/navigation";

export function TwoFactorSection({ initialEnabled }: TwoFactorSectionProps) {
  const pathname = usePathname();
  const isSpanish = pathname.includes("/admin") || pathname.includes("/buy");
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
      setTwoFactorError(isSpanish ? "Se requiere contraseña para habilitar 2FA" : "Password is required to enable 2FA");
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) {
        console.log("Error enabling 2FA:", error);
        setTwoFactorError(error.message || (isSpanish ? "Error al habilitar 2FA" : "Failed to enable 2FA"));
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
        setTwoFactorError(error.message || (isSpanish ? "Código inválido" : "Invalid code"));
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
      setTwoFactorError(isSpanish ? "Se requiere contraseña para regenerar códigos" : "Password is required to regenerate backup codes");
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error) {
        setTwoFactorError(error.message || (isSpanish ? "Error al regenerar códigos" : "Failed to regenerate codes"));
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
      setTwoFactorError(isSpanish ? "Se requiere contraseña para deshabilitar 2FA" : "Password is required to disable 2FA");
      return;
    }
    setIs2FAPending(true);
    setTwoFactorError("");
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        setTwoFactorError(error.message || (isSpanish ? "Error al deshabilitar 2FA" : "Failed to disable 2FA"));
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
                    {isSpanish ? "ACTIVO" : "ACTIVE"}
                  </span>
                )}
              </h2>
              <p className="text-base text-muted-foreground">
                {isSpanish ? "Verificación de identidad" : "Identity verification"}
              </p>
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
              {isSpanish ? "Deshabilitar" : "Disable"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="px-6 font-bold shadow-lg shadow-primary/10 active:scale-95"
              onClick={() => setShow2FADialog(true)}
              disabled={is2FAPending}
            >
              {isSpanish ? "Configurar" : "Configure"}
            </Button>
          )}
        </div>

        {is2FAEnabled && (
          <div className="mt-8 pt-8 border-t border-border flex items-center justify-between group/codes">
            <div>
              <h3 className="text-xs uppercase tracking-widest font-black text-muted-foreground/80">
                {isSpanish ? "Códigos de Respaldo" : "Backup Codes"}
              </h3>
              <p className="text-sm text-muted-foreground/60">
                {isSpanish ? "Genera llaves de recuperación extra" : "Generate extra recovery keys"}
              </p>
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
              {isSpanish ? "Gestionar" : "Manage"}
            </Button>
          </div>
        )}

        {!is2FAEnabled && (
          <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs leading-relaxed text-primary/80 font-medium">
                {isSpanish 
                  ? "Recomendamos encarecidamente habilitar 2FA. Esto añade un escudo extra a tus transacciones y datos personales dentro del ecosistema Solmaira."
                  : "We highly recommend enabling 2FA. This adds an extra shield to your transactions and personal data within the Solmaira ecosystem."}
              </p>
          </div>
        )}
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>
              {showBackupCodes 
                ? (isSpanish ? "Códigos de Respaldo" : "Backup Codes") 
                : !twoStepEnable 
                  ? (isSpanish ? "Configurar Autenticación de Dos Factores" : "Set up Two-Factor Authentication") 
                  : (isSpanish ? "Escanear Código QR" : "Scan QR Code")}
            </DialogTitle>
            <DialogDescription>
              {showBackupCodes
                ? (isSpanish 
                    ? "Guarda estos códigos en un lugar seguro. Son la única forma de recuperar tu cuenta si pierdes tu dispositivo." 
                    : "Save these codes in a safe place. They are the only way to recover your account if you lose your device.")
                : !twoStepEnable
                  ? (isSpanish ? "Protege tu cuenta con un método de verificación secundario." : "Protect your account with a secondary verification method.")
                  : (isSpanish 
                      ? "Escanea el código QR con tu aplicación de autenticación e ingresa el código." 
                      : "Scan the QR code with your authenticator app and enter the code.")}
            </DialogDescription>
          </DialogHeader>

          {showBackupCodes ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold">{isSpanish ? "Tus Códigos de Respaldo" : "Your Backup Codes"}</h3>
                <p className="text-base text-muted-foreground">
                  {isSpanish 
                    ? "Cada código puede usarse solo una vez. Guárdalos en un lugar seguro." 
                    : "Each code can be used only once. Keep them in a safe place."}
                </p>
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
                  {isSpanish ? "Copiar Todos los Códigos" : "Copy All Codes"}
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
                  {isSpanish ? "He Guardado Estos Códigos" : "I've Saved These Codes"}
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
                    ? (isSpanish 
                        ? "Verifica tu contraseña para generar un nuevo set de códigos de respaldo." 
                        : "Verify your password to generate a new set of backup codes.")
                    : (isSpanish 
                        ? "Recomendamos encarecidamente habilitar 2FA para mantener seguro tu portal de tarjetas de regalo." 
                        : "We highly recommend enabling 2FA to keep your gift card portal secure.")}
                </p>
              </div>

              <div className="space-y-2">
                {twoFactorError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{twoFactorError}</span>
                  </Alert>
                )}
                <Label htmlFor="setupPassword" title={isSpanish ? "Verifica tu contraseña para continuar" : "Verify your password to continue"}>
                  {isSpanish ? "Contraseña" : "Password"}
                </Label>
                <Input
                  id="setupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSpanish ? "Ingresa la contraseña de tu cuenta" : "Enter your account password"}
                  className="bg-muted/50 border-none h-11"
                />
              </div>

              {is2FAEnabled ? (
                <Button onClick={handleRegenerateBackupCodes} className="w-full h-11 font-semibold" disabled={is2FAPending || !password}>
                  {is2FAPending && <Spinner className="h-4 w-4 mr-2" />}
                  {isSpanish ? "Regenerar Códigos de Respaldo" : "Regenerate Backup Codes"}
                </Button>
              ) : (
                <Button onClick={handleEnable2FA} className="w-full h-11 font-semibold" disabled={is2FAPending || !password}>
                  {is2FAPending && <Spinner className="h-4 w-4 mr-2" />}
                  {isSpanish ? "Habilitar Autenticador" : "Enable Authenticator"}
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
                  {isSpanish ? "Código de Verificación" : "Verification Code"}
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
                {isSpanish ? "Verificar y Activar" : "Verify and Activate"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={handleCloseDisableDialog}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>{isSpanish ? "Deshabilitar Autenticación de Dos Factores" : "Disable Two-Factor Authentication"}</DialogTitle>
            <DialogDescription>
              {isSpanish 
                ? "¿Estás seguro de que quieres deshabilitar 2FA? Esto hará que tu cuenta sea menos segura." 
                : "Are you sure you want to disable 2FA? This will make your account less secure."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">{isSpanish ? "Contraseña de la Cuenta" : "Account Password"}</Label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSpanish ? "Confirma tu contraseña" : "Confirm your password"}
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
              {isSpanish ? "Deshabilitar 2FA" : "Disable 2FA"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
