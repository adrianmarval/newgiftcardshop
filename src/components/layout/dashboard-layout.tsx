import { DashboardSidebar } from '@/components/layout';
import { AppTopBar } from '@/components/layout';
import { authorizeByRequiredRole } from '@/lib/auth/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import type { AppSection } from '@/types';
import { dashboardMap } from '@/types';
import { Role } from '@/generated/prisma/enums';
import { Card } from '../ui/card';
import prisma from '@/lib/prisma';
import { decryptBuffer } from '@/lib/encryption';

interface DashboardLayoutProps {
  children: React.ReactNode;
  portal: AppSection;
  requiredRoles: Role[];
}

const PORTAL_BADGE_KEY: Record<AppSection, 'buyer' | 'seller' | 'admin'> = {
  buy: 'buyer',
  sell: 'seller',
  admin: 'admin',
};

export const DashboardLayout = async ({ children, portal, requiredRoles }: DashboardLayoutProps) => {
  const session = await authorizeByRequiredRole(requiredRoles);

  let initialUnreadCounts: Record<string, number> | undefined;
  let telegramPhotoDataUrl: string | null = null;
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });
    const badgeKey = PORTAL_BADGE_KEY[portal];
    initialUnreadCounts = { buyer: 0, seller: 0, admin: 0, [badgeKey]: unreadCount };

    if (session.user.telegramUser?.hasPhoto) {
      const tu = await prisma.telegramUser.findUnique({
        where: { userId: session.user.id },
        select: { photoData: true, photoMimeType: true },
      });
      if (tu?.photoData) {
        const decrypted = decryptBuffer(Buffer.from(tu.photoData));
        const mimeType = tu.photoMimeType || 'image/jpeg';
        telegramPhotoDataUrl = `data:${mimeType};base64,${decrypted.toString('base64')}`;
      }
    }
  } catch (err) {
    console.error('[DashboardLayout] Error fetching unread count:', err);
  }

  return (
    <NotificationProvider initialUnreadCounts={initialUnreadCounts}>
      <AutoRefreshProvider interval={15000}>
        <div className="flex h-svh flex-col pb-2 ring-0 lg:flex-row lg:gap-1 lg:py-14 2xl:px-40">
          {/*main content*/}
          <Card className="order-1 flex-10 overflow-hidden rounded-none py-0 shadow-2xl md:rounded-t-4xl md:p-4 lg:order-2">
            <AppTopBar
              portal={portal}
              userName={session.user.name}
              telegramPhotoDataUrl={telegramPhotoDataUrl}
              profileUrl={`${dashboardMap[portal]}/profile`}
              notificationHref={`${dashboardMap[portal]}/notifications`}
              notificationBadgeKey={PORTAL_BADGE_KEY[portal]}
            />
            <div className="flex h-full flex-col overflow-hidden p-1">
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                {children}
              </div>
            </div>
          </Card>

          {/*sidebar*/}
          <div className="bg-background order-1 flex-1 p-0 ring-0">
            <DashboardSidebar portal={portal} />
          </div>
        </div>
      </AutoRefreshProvider>
    </NotificationProvider>
  );
};
