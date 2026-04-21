'use client';

import { ProfileInfoSection } from '@/components/auth/profile/profile-info-section';
import { SecuritySection } from '@/components/auth/profile/security-section';
import { TwoFactorSection } from '@/components/auth/profile/two-factor-section';
import type { ProfileFormProps } from '@/types';

export const ProfileForm = ({ user }: ProfileFormProps) => {
  return (
    <div className="w-full space-y-3 md:space-y-4 md:p-4">
      <div className="grid gap-3 md:grid-cols-12 md:gap-4">
        <div className="space-y-3 md:col-span-7 md:space-y-4">
          <ProfileInfoSection name={user.name} email={user.email} />
        </div>

        <div className="space-y-3 md:col-span-5 md:space-y-4">
          <SecuritySection />
          <TwoFactorSection initialEnabled={user.twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
};
