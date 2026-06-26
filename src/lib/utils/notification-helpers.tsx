import { Bell, Check } from 'lucide-react';
import type { NotificationItem } from '@/types';

export function getNotificationIcon(type: NotificationItem['type'], size = 'h-4 w-4') {
  switch (type) {
    case 'STOCK_AVAILABLE':
    case 'TIER_DROP_ACCESS':
    case 'ORDER_COMPLETED':
    case 'BATCH_PAID':
      return <Check className={`${size} text-emerald-500`} />;
    case 'PAYMENT_PENDING':
      return <Bell className={`${size} text-orange-500`} />;
    default:
      return <Bell className={`text-primary ${size}`} />;
  }
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
