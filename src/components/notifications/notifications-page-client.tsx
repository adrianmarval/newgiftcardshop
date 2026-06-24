'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationsList } from './notifications-list';
import { NotificationsSettings, type NotificationsSettingsProps } from './notifications-settings';

export type NotificationItemType =
  | 'STOCK_AVAILABLE'
  | 'TIER_DROP_ACCESS'
  | 'PAYMENT_PENDING'
  | 'ORDER_COMPLETED'
  | 'BATCH_PAID'
  | 'BATCH_STATUS'
  | 'BATCH_UNDER_REVIEW'
  | 'RATE_UPDATE';


export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
  type: NotificationItemType;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}


export interface NotificationsPageClientProps {
  portal: 'buyer' | 'seller' | 'admin';
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  settingsProps: NotificationsSettingsProps;
}

export const NotificationsPageClient = ({
  portal,
  initialNotifications,
  initialUnreadCount,
  settingsProps,
}: NotificationsPageClientProps) => {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'settings' ? 'settings' : 'notifications';
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notifications' | 'settings')}>
      <TabsList className="border-border bg-muted/50 mb-3 grid h-10 w-full grid-cols-2 rounded-xl border p-1">
        <TabsTrigger
          value="notifications"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-lg text-xs font-semibold data-[state=active]:shadow-sm"
        >
          Notificaciones
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-lg text-xs font-semibold data-[state=active]:shadow-sm"
        >
          Configuración
        </TabsTrigger>
      </TabsList>

      <TabsContent value="notifications" className="mt-0">
        <NotificationsList portal={portal} initialNotifications={initialNotifications} initialUnreadCount={initialUnreadCount} />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <NotificationsSettings {...settingsProps} />
      </TabsContent>
    </Tabs>
  );
};
