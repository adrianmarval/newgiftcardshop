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
    <div className="w-full space-y-6 p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-white md:text-3xl">{isSpanish ? 'Perfil' : 'Profile'}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {isSpanish ? `Gestiona tu información y seguridad` : `Manage your information and security`}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <ProfileInfoSection name={user.name} email={user.email} />
        </div>

        <div className="space-y-6 lg:col-span-5">
          <SecuritySection />
          <TwoFactorSection initialEnabled={user.twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
};
