'use client';

import { Power } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationDropdown } from '@/components/layout';
import { useLogout } from '@/hooks/use-logout';
import type { AppSection } from '@/types';
import { cn } from '@/lib/ui';

interface AppTopBarProps {
  portal: AppSection;
  userName: string;
  telegramPhotoDataUrl?: string | null;
  profileUrl: string;
  notificationHref: string;
  notificationBadgeKey: string;
}

function getInitial(name: string) {
  return name?.charAt(0).toUpperCase() || '?';
}

const INITIAL_COLORS = [
  'bg-rose-600',
  'bg-violet-600',
  'bg-sky-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-teal-600',
];

function getInitialColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

export function AppTopBar({ portal, userName, telegramPhotoDataUrl, profileUrl, notificationHref, notificationBadgeKey }: AppTopBarProps) {
  const { handleLogout, isLoggingOut } = useLogout(portal);

  return (
    <div className="bg-background md:bg-card flex items-center justify-between px-2 py-1 hover:text-gray-400 md:rounded-4xl">
      <Link href={profileUrl} className="flex items-center gap-2">
        {telegramPhotoDataUrl ? (
          <img src={telegramPhotoDataUrl} alt={userName} className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div
            className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white', getInitialColor(userName))}
          >
            {getInitial(userName)}
          </div>
        )}
        <span className="text-sm font-medium">{userName}</span>
      </Link>
      <div className="relative flex items-center gap-0.5">
        <NotificationDropdown
          portal={portal}
          badgeKey={notificationBadgeKey}
          href={notificationHref}
          className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
        />
        <ThemeToggle />
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            isLoggingOut && 'opacity-50',
          )}
        >
          <Power className="h-5 w-5 text-red-800 hover:scale-105 hover:text-red-700" />
        </button>
      </div>
    </div>
  );
}
