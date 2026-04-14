import { getSession } from '@/lib/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perfil | Panel de Administración | Solmaira Cards',
  description: 'Gestiona los ajustes de tu perfil de administrador de Solmaira',
};

export default async function AdminProfilePage() {
  const session = await getSession();

  return (
    <ProfileForm
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        twoFactorEnabled: !!session.user.twoFactorEnabled,
      }}
      portal="admin"
    />
  );
}
