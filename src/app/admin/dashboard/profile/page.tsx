import { getSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Admin Dashboard | Solmaira Cards",
  description: "Manage your Solmaira admin profile settings",
};

export default async function AdminProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    return redirect("/admin/auth/login");
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
        portal="admin"
      />
    </div>
  );
}
