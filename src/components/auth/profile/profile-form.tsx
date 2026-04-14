'use client';

import { motion } from 'framer-motion';
import { ProfileInfoSection } from '@/components/auth/profile/profile-info-section';
import { SecuritySection } from '@/components/auth/profile/security-section';
import { TwoFactorSection } from '@/components/auth/profile/two-factor-section';
import type { ProfileFormProps } from '@/types';

const portalLabels: Record<ProfileFormProps['portal'], string> = {
  admin: 'Administrador',
  sell: 'Seller',
  buy: 'Comprador',
};

export const ProfileForm = ({ user, portal }: ProfileFormProps) => {
  const isSpanish = portal === 'admin' || portal === 'buy';

  return (
    <div className="w-full space-y-4 px-0 py-2 md:space-y-6 md:px-0 md:py-0">
      {/* Header */}
      <div className="border-border bg-card/40 flex flex-col justify-between gap-4 rounded-none border-y px-3 py-4 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <h1 className="mb-0.5 text-3xl font-bold md:mb-1 md:text-4xl">{isSpanish ? 'Ajustes de Perfil' : 'Profile Settings'}</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {isSpanish
              ? `Gestiona los ajustes de tu cuenta de ${portalLabels[portal].toLowerCase()} y tus preferencias de seguridad.`
              : `Manage your ${portalLabels[portal].toLowerCase()} account settings and security preferences.`}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Personal Information */}
        <div className="space-y-6 lg:col-span-7">
          <ProfileInfoSection name={user.name} email={user.email} />
        </div>

        {/* Right Column: Security & 2FA */}
        <div className="space-y-6 lg:col-span-5">
          <SecuritySection />
          <TwoFactorSection initialEnabled={user.twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
};
