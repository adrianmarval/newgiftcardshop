"use server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const LoginData = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  portal: z.enum(["sell", "buy", "admin"]),
});

const dashboardMap = {
  sell: "/sell/dashboard",
  buy: "/buy/dashboard",
  admin: "/admin/dashboard",
} as const;

const roleMap = {
  sell: "SELLER",
  buy: "BUYER",
  admin: "ADMIN",
} as const;

export const login = async (prevState: unknown, formData: FormData) => {
  const result = LoginData.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { email, password, portal } = result.data;
  const callbackURL = dashboardMap[portal];
  const requiredRole = roleMap[portal];

  // 1. Declarar una variable para almacenar la ruta de destino
  let redirectPath: string | null = null;

  try {
    const response = (await auth.api.signInEmail({
      body: { email, password, callbackURL },
      headers: await headers(),
    })) as any;

    // 2. Asignar la ruta de 2FA si es necesario (sin hacer el redirect aún)
    if (response.twoFactorRedirect) {
      redirectPath = `/${portal}/auth/verify-2fa`;
    } else {
      // Verificar si el usuario tiene el rol requerido (solo si no va a 2FA)
      const user = response.user as typeof response.user & {
        role?: string[];
      };

      if (!user.role?.includes(requiredRole)) {
        await auth.api.signOut({ headers: await headers() });
        return `Your account does not have ${requiredRole.toLowerCase()} access`;
      }

      // Si todo sale bien, asignamos la ruta del dashboard
      redirectPath = callbackURL;
    }
  } catch (error) {
    console.error("Login error:", error);
    return "Invalid email or password";
  }

  // 3. Ejecutar la redirección FUERA del try/catch
  if (redirectPath) {
    redirect(redirectPath);
  }
};
