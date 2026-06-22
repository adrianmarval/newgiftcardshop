import type { NotificationChannel, NotificationChannelResult } from '../types';

export const WebChannel: NotificationChannel = {
  name: 'web',

  async send(): Promise<NotificationChannelResult> {
    return { status: 'sent' };
  },
};
