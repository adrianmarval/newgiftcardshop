'use server';

import { z } from 'zod';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { authActionClient } from '@/lib/safe-action';

const updateProfileInputSchema = z.object({
  name: z.string().trim().min(2).optional().catch(undefined),
  currentPassword: z.string().trim().optional(),
  newPassword: z
    .string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val || val.length === 0) return true;
      return val.length >= 8;
    }, 'New password must be at least 8 characters'),
  confirmPassword: z.string().trim().optional(),
});

const updateProfileOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    user: z.object({ name: z.string(), email: z.string(), image: z.string().nullable() }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const updateProfile = authActionClient
  .inputSchema(updateProfileInputSchema)
  .outputSchema(updateProfileOutputSchema)
  .action(async function ({ parsedInput: { name, currentPassword, newPassword, confirmPassword } }) {
    if (newPassword && !currentPassword) {
      return { success: false as const, error: 'Current password is required to set a new password' };
    }
    if (newPassword && newPassword !== confirmPassword) {
      return { success: false as const, error: 'New passwords do not match' };
    }

    try {
      if (name && name.trim().length >= 2) {
        await auth.api.updateUser({
          body: { name: name.trim() },
          headers: await headers(),
        });
      }

      if (currentPassword && newPassword) {
        await auth.api.changePassword({
          body: {
            currentPassword,
            newPassword,
          },
          headers: await headers(),
        });
      }

      const user = await auth.api.getSession({
        headers: await headers(),
      });

      return {
        success: true as const,
        user: {
          name: user?.user?.name ?? name ?? '',
          email: user?.user?.email ?? '',
          image: user?.user?.image ?? null,
        },
      };
    } catch (error) {
      console.error('[update-profile] error:', JSON.stringify(error, null, 2));
      const err = error as { message?: string; code?: string };
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('incorrect') || msg.includes('wrong') || msg.includes('invalid')) {
        return { success: false as const, error: 'La contraseña actual es incorrecta' };
      }
      if (msg.includes('same') || msg.includes('equal')) {
        return { success: false as const, error: 'La nueva contraseña no puede ser igual a la actual' };
      }
      return { success: false as const, error: 'Error al actualizar. Intenta de nuevo.' };
    }
  });
