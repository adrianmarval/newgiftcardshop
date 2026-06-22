import type { NotificationChannel, NotificationChannelResult } from '../types';

export const WhatsAppChannel: NotificationChannel = {
  name: 'whatsapp',

  async send(): Promise<NotificationChannelResult> {
    return {
      status: 'failed',
      error: 'WhatsApp channel not implemented yet — pending Baylis integration',
    };
  },
};
