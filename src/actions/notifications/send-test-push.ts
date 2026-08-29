'use server';

import { authActionClient } from '@/lib/safe-action';
import { WebPushChannel } from '@/lib/notifications/channels/webpush.channel';
import { sendTestPushInputSchema, sendTestPushOutputSchema } from './schemas';
import type { Session } from '@/types';

// Keyed por portal (NO por rol): el SW que recibe el push es el del portal
// donde el usuario se suscribió — abrir el dashboard de ese portal mantiene
// el containment de la WebAPK (un ADMIN puede operar los 3 portales).
const PORTAL_DASHBOARD: Record<'buyer' | 'seller' | 'admin', string> = {
  seller: '/sell/dashboard',
  buyer: '/store/dashboard',
  admin: '/admin/dashboard',
};

/**
 * Envía una notificación push de prueba al usuario autenticado.
 * Llama al WebPushChannel directamente (bypass del dispatcher): NO persiste
 * una Notification in-app ni dispara otros canales — es un test del pipeline
 * push únicamente. Devuelve el resultado crudo del canal para diagnóstico.
 *
 * El cliente envía title/description localizados (seller=EN, buyer/admin=ES)
 * para que el push se muestre en el idioma correcto del portal.
 */
export const sendTestPush = authActionClient
  .inputSchema(sendTestPushInputSchema)
  .outputSchema(sendTestPushOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const user = ctx.auth.user as Session['user'];

    const result = await WebPushChannel.send(
      { userId: user.id, userRole: user.role },
      {
        type: 'BATCH_STATUS',
        title: parsedInput.title,
        description: parsedInput.description,
        actionUrl: PORTAL_DASHBOARD[parsedInput.portal],
      },
    );

    return {
      success: true as const,
      status: result.status,
      ...(result.status === 'skipped' ? { reason: result.reason } : {}),
      ...(result.status === 'failed' ? { error: result.error } : {}),
    };
  });
