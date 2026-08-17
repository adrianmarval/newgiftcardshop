'use server';

import { authActionClient } from '@/lib/safe-action';
import { WebPushChannel } from '@/lib/notifications/channels/webpush.channel';
import { sendTestPushInputSchema, sendTestPushOutputSchema } from './schemas';
import type { Session } from '@/types';

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
        actionUrl: '/',
      },
    );

    return {
      success: true as const,
      status: result.status,
      ...(result.status === 'skipped' ? { reason: result.reason } : {}),
      ...(result.status === 'failed' ? { error: result.error } : {}),
    };
  });
