import { getSession } from '@/lib/authorization';
import { ProfileForm } from '@/components/auth/profile/profile-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | Seller Dashboard | Solmaira Cards',
  description: 'Manage your Solmaira seller profile settings',
};

export default async function SellerProfilePage() {
  const session = await getSession();

  return (
    <div className="container mx-auto space-y-4 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tighter italic md:text-7xl">MY PROFILE</h1>
        <p className="text-muted-foreground text-base md:text-lg">Manage your account information.</p>
      </div>
      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          twoFactorEnabled: !!session.user.twoFactorEnabled,
        }}
        portal="sell"
      />
    </div>
  );
}
