"use client";

import { motion } from "framer-motion";
import { ProfileInfoSection } from "./profile-info-section";
import { SecuritySection } from "./security-section";
import { TwoFactorSection } from "./two-factor-section";
import type { ProfileFormProps } from "@/types";

const portalLabels: Record<ProfileFormProps["portal"], string> = {
  admin: "Admin",
  sell: "Seller",
  buy: "Buyer",
};

export function ProfileForm({ user, portal }: ProfileFormProps) {
  return (
    <div className="w-full space-y-4 md:space-y-6 px-0 md:px-0 py-2 md:py-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-card/40 px-3 py-4 md:p-6 rounded-none md:rounded-xl border-y md:border border-border backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold mb-0.5 md:mb-1">Profile Settings</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Manage your {portalLabels[portal].toLowerCase()} account settings and security preferences.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Personal Information */}
        <div className="lg:col-span-7 space-y-6">
          <ProfileInfoSection name={user.name} email={user.email} />
        </div>

        {/* Right Column: Security & 2FA */}
        <div className="lg:col-span-5 space-y-6">
          <SecuritySection />
          <TwoFactorSection initialEnabled={user.twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
}
