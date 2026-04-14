'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { authActionClient } from '@/lib/safe-action';
import { updateProfileSchema, updateProfileOutputSchema } from '@/types/auth/schemas';

export const updateProfile = authActionClient
  .inputSchema(updateProfileSchema)
  .outputSchema(updateProfileOutputSchema)
  .action(async function ({ parsedInput: { name, currentPassword, newPassword, confirmPassword } }) {
    // Validate password change fields
    if (newPassword && !currentPassword) {
      return { error: 'Current password is required to set a new password' };
    }
    if (newPassword && newPassword !== confirmPassword) {
      return { error: 'New passwords do not match' };
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

      // Fetch updated user for response
      const user = await auth.api.getSession({
        headers: await headers(),
      });

      return {
        success: true,
        user: {
          name: user?.user?.name ?? name,
          email: user?.user?.email ?? '',
          image: user?.user?.image ?? null,
        },
      };
    } catch (error) {
      console.error('Update profile error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      if (message.includes('password') || message.includes('incorrect')) {
        return { error: 'Current password is incorrect' };
      }
      return { error: 'Failed to update profile. Please try again.' };
    }
  });
