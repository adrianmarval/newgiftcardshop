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
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black tracking-tighter italic md:text-7xl">MI PERFIL</h1>
        <p className="text-muted-foreground text-base md:text-lg">Gestiona la información de tu cuenta.</p>
      </div>
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
