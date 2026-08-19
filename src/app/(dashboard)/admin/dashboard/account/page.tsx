import { getSession } from '@/lib/auth/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';
import { decryptBuffer } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: `Account | Admin Dashboard | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Manage your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} admin account settings`,
};

export default async function AdminAccountPage() {
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

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Account</h1>
      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          image: null,
          twoFactorEnabled: !!session.user.twoFactorEnabled,
          createdAt: session.user.createdAt,
          telegramUser,
        }}
        telegramPhotoDataUrl={telegramPhotoDataUrl}
        portal="admin"
      />
    </div>
  );
}
