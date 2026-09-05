import { Bell, Check, TrendingUp } from 'lucide-react';
import type { NotificationType } from '@/generated/prisma/enums';

export function NotificationIcon({ type, size = 'h-4 w-4' }: { type: NotificationType; size?: string }) {
  switch (type) {
    case 'STOCK_AVAILABLE':
    case 'TIER_DROP_ACCESS':
    case 'ORDER_COMPLETED':
    case 'BATCH_PAID':
      return <Check className={`${size} text-emerald-500`} />;
    case 'PROFIT_REALIZED':
      return <TrendingUp className={`${size} text-emerald-500`} />;
    case 'PAYMENT_PENDING':
    case 'PAYMENT_REMINDER':
      return <Bell className={`${size} text-orange-500`} />;
    case 'STOCK_REMINDER':
      return <Bell className={`${size} text-amber-500`} />;
    default:
      return <Bell className={`text-primary ${size}`} />;
  }
}
