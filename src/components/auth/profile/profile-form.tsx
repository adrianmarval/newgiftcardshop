'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProfileInfoSection } from '@/components/auth/profile/profile-info-section';
import { SecuritySection } from '@/components/auth/profile/security-section';
import { TwoFactorSection } from '@/components/auth/profile/two-factor-section';
import { PaymentMethodSection } from '@/components/sell/payment-method';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, ShieldCheck, Wallet } from 'lucide-react';
import type { AppSection } from '@/types';

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    twoFactorEnabled: boolean;
    createdAt?: Date | null;
    creditLimit?: number | null;
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
}

const VALID_TABS = ['profile', 'security', '2fa', 'wallet'] as const;
type TabValue = (typeof VALID_TABS)[number];

export const ProfileForm = ({ user, telegramPhotoDataUrl, portal, telegramLinkUrl }: ProfileFormProps) => {
  const searchParams = useSearchParams();
  const emailVerified = true;
  const isSeller = portal === 'sell';

  const tabParam = searchParams.get('tab');
  const initialTab: TabValue = tabParam && VALID_TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'profile';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Lock className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="2fa" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> 2FA
          </TabsTrigger>
          {isSeller && (
            <TabsTrigger value="wallet" className="gap-1.5">
              <Wallet className="h-4 w-4" /> Wallet
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="profile">
            <ProfileInfoSection
              name={user.name}
              email={user.email}
              emailVerified={emailVerified}
              portal={portal}
              createdAt={user.createdAt}
              creditLimit={user.creditLimit}
              telegramUser={user.telegramUser}
              telegramPhotoDataUrl={telegramPhotoDataUrl}
              telegramLinkUrl={telegramLinkUrl}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySection />
          </TabsContent>

          <TabsContent value="2fa">
            <TwoFactorSection initialEnabled={user.twoFactorEnabled} />
          </TabsContent>

          {isSeller && (
            <TabsContent value="wallet">
              <PaymentMethodSection isSeller={isSeller} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};
