import { getSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Solmaira Cards",
  description: "Manage your Solmaira account profile settings",
};

export default async function BuyerProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    return redirect("/buy/auth/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
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
