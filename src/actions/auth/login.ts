"use server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const LoginData = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const login = async (prevState: unknown, formData: FormData) => {
  const result = LoginData.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { email, password } = result.data;

  console.log({ email, password });

  try {
    await auth.api.signInEmail({
      body: { email, password, callbackURL: "/dashboard" },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return "An error occurred while logging in";
  }
  redirect("/dashboard");
};
