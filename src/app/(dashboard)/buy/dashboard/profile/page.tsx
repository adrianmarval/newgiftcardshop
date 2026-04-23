import { getSession } from '@/lib/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | Solmaira Cards',
  description: 'Manage your Solmaira account profile settings',
};

export default async function BuyerProfilePage() {
  const session = await getSession();

  return (
    <div className="container mx-auto space-y-4 py-2">
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
        portal="buy"
      />
    </div>
  );
}
