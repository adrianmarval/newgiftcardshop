'use client';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { NavItem } from './types';

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
} from 'react-icons/fa';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
};

interface SidebarItemProps {
  item: NavItem;
}
export const SidebarItem = ({ item }: SidebarItemProps) => {
  const pathName = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isActive = pathName === item.url;

  const IconComponent = ICON_MAP[item.icon] || FaHome;

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
        'flex flex-col items-center justify-center rounded-xl p-1 transition-all duration-100',
        isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground active:bg-muted active:text-foreground',
      )}
    >
      <IconComponent className="h-6 w-6 lg:h-12 lg:w-12" />
      <span className="md:text-md text-xs font-semibold tracking-wide">{item.title}</span>
    </Link>
  );
};
