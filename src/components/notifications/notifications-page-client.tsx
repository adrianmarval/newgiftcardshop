'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationsView, type NotificationItem } from './notifications-view';
import { NotificationsSettings, type NotificationsSettingsProps } from './notifications-settings';

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
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notifications' | 'settings')}>
      <TabsList className="bg-muted/50 border-border mb-3 grid h-10 w-full grid-cols-2 rounded-xl border p-1">
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
        <NotificationsView
          portal={portal}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <NotificationsSettings {...settingsProps} />
      </TabsContent>
    </Tabs>
  );
};