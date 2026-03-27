import Form from "next/form";
import { logout } from "@/actions";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/auth/login");

  const { user } = session;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="aspect-video rounded-xl bg-muted/50">{user.email}</div>
        <div className="aspect-video rounded-xl bg-muted/50">{user.name} </div>
        <div className="aspect-video rounded-xl bg-muted/50">{user.id} </div>
        <Form action={logout}>
          <Button variant={"destructive"}>Sign Out</Button>
        </Form>
      </div>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </div>
  );
}
