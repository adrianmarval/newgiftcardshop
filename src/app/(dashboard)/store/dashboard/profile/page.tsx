import { getSession } from '@/lib/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';
import { decryptBuffer } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: `Profile | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Manage your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} account profile settings`,
};

export default async function BuyerProfilePage() {
  const session = await getSession();
  const telegramUser = session.user.telegramUser ?? null;

  let telegramPhotoDataUrl: string | null = null;
  if (telegramUser?.hasPhoto) {
    const tu = await prisma.telegramUser.findUnique({
      where: { userId: session.user.id },
      select: { photoData: true, photoMimeType: true },
    });
    if (tu?.photoData) {
      const decrypted = decryptBuffer(Buffer.from(tu.photoData));
      const mimeType = tu.photoMimeType || 'image/jpeg';
      telegramPhotoDataUrl = `data:${mimeType};base64,${decrypted.toString('base64')}`;
    }
  }

  const botUsername = process.env.BUYER_BOT_USERNAME;
  const telegramLinkUrl = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <ProfileForm
      user={{
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: null,
        twoFactorEnabled: !!session.user.twoFactorEnabled,
        telegramUser,
      }}
      telegramPhotoDataUrl={telegramPhotoDataUrl}
      portal="buy"
      telegramLinkUrl={telegramLinkUrl}
    />
  );
}
