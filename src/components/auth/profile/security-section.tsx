"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import type { SecuritySectionProps } from "@/types";
import { usePathname } from "next/navigation";

export function SecuritySection({ isPending = false }: SecuritySectionProps) {
  const pathname = usePathname();
  const isSpanish = pathname.includes("/admin") || pathname.includes("/buy");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  return (
    <Card className="p-5 md:p-8 bg-card/60 backdrop-blur-sm border-border relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
              <h2 className="text-2xl font-bold text-foreground">
                {isSpanish ? "Seguridad" : "Security"}
              </h2>
              <p className="text-base text-muted-foreground">
                {isSpanish ? "Gestión de acceso" : "Access management"}
              </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`border-border transition-all font-bold text-xs uppercase tracking-wider px-4 ${showPasswordFields ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" : "bg-muted/40 hover:bg-muted/60"}`}
          onClick={() => setShowPasswordFields(!showPasswordFields)}
        >
          {showPasswordFields 
            ? (isSpanish ? "Cancelar" : "Cancel") 
            : (isSpanish ? "Modificar Contraseña" : "Modify Password")}
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
              <Label htmlFor="currentPassword" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80">
                {isSpanish ? "Contraseña Actual" : "Current Password"}
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
                <Label htmlFor="newPassword" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80">
                  {isSpanish ? "Nueva Contraseña" : "New Password"}
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
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80">
                  {isSpanish ? "Confirmar Contraseña" : "Confirm Password"}
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
              <p className="text-xs text-muted-foreground/50 italic">
                {isSpanish 
                  ? "La contraseña debe tener al menos 8 caracteres con números y símbolos." 
                  : "Password must be at least 8 characters long with numbers and symbols."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPasswordFields && (
        <div className="h-6 flex items-center">
          <p className="text-sm text-muted-foreground/40 italic">
            {isSpanish 
              ? "Los campos de contraseña están ocultos para tu protección." 
              : "Password fields are hidden for your protection."}
          </p>
        </div>
      )}
    </Card>
  );
}
