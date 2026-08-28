'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { grantSecurityUnlock } from '@/lib/services';
import { unlockOutputSchema } from './schemas';

/**
 * Grants the code-reveal unlock after a WebAuthn ceremony.
 *
 * The passkey verification itself happens client-side against the plugin
 * endpoints (`/passkey/generate-authenticate-options` + `/passkey/verify-authentication`),
 * which establish a fresh session for the passkey's owner. This action only runs
 * when that session is valid (buyerActionClient) AND the user owns at least one
 * passkey — so a bare session cookie cannot self-grant the unlock.
 */
export const unlockWithPasskey = buyerActionClient
  .outputSchema(unlockOutputSchema)
  .action(async ({ ctx }) => {
    const passkeyCount = await prisma.passkey.count({ where: { userId: ctx.auth.user.id } });
    if (passkeyCount === 0) throw new ActionError('No tienes una passkey registrada. Usa tu PIN de seguridad.');
    const until = await grantSecurityUnlock(ctx.auth.user.id);
    return { success: true as const, unlockedUntil: until.toISOString() };
  });
