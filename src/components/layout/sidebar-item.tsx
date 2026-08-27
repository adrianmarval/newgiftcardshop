'use client';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/use-theme';
import { NavItem } from './types';
import { useNotifications } from '@/providers/notification-provider';
import { cn } from '@/lib/ui';

import {
  FaHome,
  FaHistory,
  FaShoppingCart,
  FaUser,
  FaBell,
  FaCreditCard,
  FaMoneyBillWave,
  FaUsers,
  FaTag,
  FaCog,
  FaMoon,
  FaSun,
  FaClipboardList,
  FaCoins,
  FaExclamationTriangle,
} from 'react-icons/fa';
import Link from 'next/link';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: FaHome,
  history: FaHistory,
  cart: FaShoppingCart,
  user: FaUser,
  bell: FaBell,
  cards: FaCreditCard,
  cash: FaMoneyBillWave,
  users: FaUsers,
  tag: FaTag,
  settings: FaCog,
  theme: FaMoon,
  logs: FaClipboardList,
  coins: FaCoins,
  alert: FaExclamationTriangle,
};

interface SidebarItemProps {
  item: NavItem;
}

export const SidebarItem = ({ item }: SidebarItemProps) => {
  const pathName = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { unreadCounts } = useNotifications();

  const isActive = pathName === item.url;
  const IconComponent = ICON_MAP[item.icon] || FaHome;
  const badgeCount = item.badgeKey ? unreadCounts[item.badgeKey] || 0 : 0;

  if (item.icon === 'theme') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl p-3 transition-all duration-200',
          isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground active:bg-muted active:text-foreground',
        )}
      >
        {theme === 'dark' ? <FaSun className="h-6 w-6" /> : <FaMoon className="h-6 w-6" />}
        <span className="text-xs font-semibold tracking-wide">{item.title}</span>
      </button>
    );
  }

  return (
    <Link
      href={item.url}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl p-1 transition-all duration-100',
        isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground active:bg-muted active:text-foreground',
      )}
    >
      <div className="relative">
        <IconComponent className="h-6 w-6 lg:w-12" />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground animate-pulse">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </div>
      <span className="md:text-sm text-xs font-semibold tracking-wide">{item.title}</span>
    </Link>
  );
};