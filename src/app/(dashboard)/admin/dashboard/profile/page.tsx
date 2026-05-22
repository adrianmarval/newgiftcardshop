import { getSession } from '@/lib/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';
import { decryptBuffer } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: `Perfil | Panel de Administración | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Gestiona los ajustes de tu perfil de administrador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function AdminProfilePage() {
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
    <div className="w-full space-y-4">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">MI PERFIL</h1>
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
        portal="admin"
      />
    </div>
  );
}
