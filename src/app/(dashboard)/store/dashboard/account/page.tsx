import { getSession } from '@/lib/auth/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';
import { getDecryptedTelegramPhotoUrl } from '@/lib/telegram';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: `Cuenta | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Administra la configuración de tu cuenta en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function BuyerAccountPage() {
  const session = await getSession();
  const telegramUser = session.user.telegramUser ?? null;

  let telegramPhotoDataUrl: string | null = null;
  if (telegramUser?.hasPhoto) {
    telegramPhotoDataUrl = await getDecryptedTelegramPhotoUrl(session.user.id);
  }

  const botUsername = process.env.BUYER_BOT_USERNAME;
  const telegramLinkUrl = botUsername ? `https://t.me/${botUsername}` : null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creditLimit: true },
  });

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Cuenta</h1>
      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          image: null,
          twoFactorEnabled: !!session.user.twoFactorEnabled,
          createdAt: session.user.createdAt,
          creditLimit: user?.creditLimit ? Number(user.creditLimit) : null,
          telegramUser,
        }}
        telegramPhotoDataUrl={telegramPhotoDataUrl}
        portal="buy"
        telegramLinkUrl={telegramLinkUrl}
      />
    </div>
  );
}
