import { getSession } from "@/lib/authorization";
import { ProfileForm } from "@/components/auth/profile/profile-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Seller Dashboard | Solmaira Cards",
  description: "Manage your Solmaira seller profile settings",
};

export default async function SellerProfilePage() {
  const session = await getSession();

  return (
    <ProfileForm
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        twoFactorEnabled: !!session.user.twoFactorEnabled,
      }}
      portal="sell"
    />
  );
}
