"use server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const RegisterData = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number")
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain a special character"),
    confirmPassword: z.string(),
    portal: z.enum(["sell", "buy"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const dashboardMap = {
  sell: "/sell/dashboard",
  buy: "/buy/dashboard",
} as const;

const roleMap = {
  sell: "SELLER",
  buy: "BUYER",
} as const;

export const register = async (prevState: unknown, formData: FormData) => {
  const result = RegisterData.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { fullName, email, password, portal } = result.data;
  const callbackURL = dashboardMap[portal];
  const role = roleMap[portal];

  try {
    await auth.api.signUpEmail({
      body: {
        name: fullName,
        email,
        password,
        role: [role],
        callbackURL,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return "An error occurred during registration. The email may already be in use.";
  }

  redirect(callbackURL);
};
