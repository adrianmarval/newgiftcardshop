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
 * which establish a FRESH session for the passkey's owner. This action requires
 * that fresh session: a stolen/old session cookie (the anti-theft scenario this
 * gate exists for) fails the freshness check and cannot self-grant the unlock.
 */
// Ventana máxima entre la ceremonia WebAuthn (que crea la sesión nueva) y esta action.
const FRESH_SESSION_WINDOW_MS = 60_000;

export const unlockWithPasskey = buyerActionClient.outputSchema(unlockOutputSchema).action(async ({ ctx }) => {
  const passkeyCount = await prisma.passkey.count({ where: { userId: ctx.auth.user.id } });
  if (passkeyCount === 0) throw new ActionError('No tienes una passkey registrada. Usa tu PIN de seguridad.');

  // Gate de frescura: ctx.auth.session viene tipado de $Infer.Session (el
  // callback de customSession en auth-server retorna { user, session }).
  const sessionCreatedAt = new Date(ctx.auth.session.createdAt).getTime();
  if (Number.isNaN(sessionCreatedAt) || Date.now() - sessionCreatedAt > FRESH_SESSION_WINDOW_MS) {
    throw new ActionError('La verificación con passkey expiró. Intenta de nuevo.');
  }

  const until = await grantSecurityUnlock(ctx.auth.user.id);
  return { success: true as const, unlockedUntil: until.toISOString() };
});
