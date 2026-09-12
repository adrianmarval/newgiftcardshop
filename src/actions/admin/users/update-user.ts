'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { logger } from '@/lib/logger';
import { updateUserInputSchema, updateUserOutputSchema } from './schemas';

export const updateUser = adminActionClient
  .inputSchema(updateUserInputSchema)
  .outputSchema(updateUserOutputSchema)
  .action(async function ({ parsedInput, ctx }) {
    try {
      const {
        userId,
        role,
        isActive,
        creditLimit,
        minAmountPreference,
        maxAmountPreference,
        allowSearchPreferences,
        allowBuyRateAdjustment,
      } = parsedInput;

      // Guard de la cuenta admin única: nadie puede cambiarle el rol ni
      // desactivarla por esta vía (con el check de isActive aplicado también
      // a ADMIN, desactivarla = lockout total del panel).
      if (role !== undefined || isActive !== undefined) {
        const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (target?.role === 'ADMIN') {
          throw new ActionError('No se puede cambiar el rol ni el estado de la cuenta administradora');
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
          ...(creditLimit !== undefined && { creditLimit }),
          ...(minAmountPreference !== undefined && { minAmountPreference }),
          ...(maxAmountPreference !== undefined && { maxAmountPreference }),
          ...(allowSearchPreferences !== undefined && { allowSearchPreferences }),
          ...(allowBuyRateAdjustment !== undefined && { allowBuyRateAdjustment }),
        },
        select: { id: true },
      });

      // Audit trail — las mutaciones de usuarios SIEMPRE quedan logueadas
      // (el incidente de sept 2026 demostró el agujero forense de no tenerlo).
      logger.action('admin', 'update-user', `Usuario ${userId} actualizado por admin`, {
        userId: ctx.auth.user.id,
        metadata: {
          targetUserId: userId,
          changes: {
            ...(role !== undefined && { role }),
            ...(isActive !== undefined && { isActive }),
            ...(creditLimit !== undefined && { creditLimit }),
            ...(minAmountPreference !== undefined && { minAmountPreference }),
            ...(maxAmountPreference !== undefined && { maxAmountPreference }),
            ...(allowSearchPreferences !== undefined && { allowSearchPreferences }),
            ...(allowBuyRateAdjustment !== undefined && { allowBuyRateAdjustment }),
          },
        },
      });

      return { success: true as const, userId: updated.id };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error('Update user error:', error);
      throw new ActionError('Failed to update user');
    }
  });