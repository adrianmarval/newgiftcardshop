import { getSession } from '@/lib/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Perfil | Panel de Administración | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Gestiona los ajustes de tu perfil de administrador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function AdminProfilePage() {
  const session = await getSession();

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">MI PERFIL</h1>
      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          twoFactorEnabled: !!session.user.twoFactorEnabled,
        }}
        portal="admin"
      />
    </div>
  );
}
