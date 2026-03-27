"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

const UpdateProfileData = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.length === 0) return true;
        return val.length >= 8;
      },
      "New password must be at least 8 characters",
    ),
  confirmPassword: z.string().optional(),
});

export const updateProfile = async (
  prevState: unknown,
  formData: FormData,
) => {
  const result = UpdateProfileData.safeParse({
    name: formData.get("name"),
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, currentPassword, newPassword, confirmPassword } = result.data;

  // Validate password change fields
  if (newPassword && !currentPassword) {
    return { error: "Current password is required to set a new password" };
  }
  if (newPassword && newPassword !== confirmPassword) {
    return { error: "New passwords do not match" };
  }

  try {
    // Update user name
    await auth.api.updateUser({
      body: { name },
      headers: await headers(),
    });

    // Change password if requested
    if (currentPassword && newPassword) {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: await headers(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    if (message.includes("password") || message.includes("incorrect")) {
      return { error: "Current password is incorrect" };
    }
    return { error: "Failed to update profile. Please try again." };
  }
};
