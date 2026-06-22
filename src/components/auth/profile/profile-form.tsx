'use client';

import { ProfileInfoSection } from '@/components/auth/profile/profile-info-section';
import { SecuritySection } from '@/components/auth/profile/security-section';
import { TwoFactorSection } from '@/components/auth/profile/two-factor-section';
import { NotificationsSection } from '@/components/auth/profile/notifications-section';
import { AppSection } from '@/types';

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    twoFactorEnabled: boolean;
    telegramUser?: {
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      hasPhoto: boolean;
      languageCode: string | null;
    } | null;
  };
  telegramPhotoDataUrl?: string | null;
  portal: AppSection;
  telegramLinkUrl?: string | null;
  notificationPreferences?: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    whatsappPhone: string | null;
  };
}

export const ProfileForm = ({
  user,
  telegramPhotoDataUrl,
  portal,
  telegramLinkUrl,
  notificationPreferences,
}: ProfileFormProps) => {
  const emailVerified = true;

  return (
    <div className="w-full space-y-3">
      <div className="grid gap-1 md:grid-cols-12 md:gap-1">
        <div className="space-y-3 md:col-span-7 md:space-y-1">
          <ProfileInfoSection
            name={user.name}
            email={user.email}
            emailVerified={emailVerified}
            portal={portal}
            telegramUser={user.telegramUser}
            telegramPhotoDataUrl={telegramPhotoDataUrl}
            telegramLinkUrl={telegramLinkUrl}
          />
        </div>

        <div className="space-y-3 md:col-span-5 md:space-y-1">
          <NotificationsSection
            portal={portal}
            telegramLinked={!!user.telegramUser}
            initialPreferences={notificationPreferences}
          />
          <SecuritySection />
          <TwoFactorSection initialEnabled={user.twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
};
