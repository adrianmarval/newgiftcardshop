'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLongPress } from '@/hooks/use-long-press';
import { apiQuery } from '@/lib/utils';
import { cn } from '@/lib/ui';

export interface UserBadgeUser {
  id: string;
  name: string;
  email: string;
  telegramUser?: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
    hasPhoto: boolean;
  } | null;
}

interface UserBadgeProps {
  user: UserBadgeUser;
  /** xs = footer de giftcard en detalles, sm = compacto (subtitle de RegistryCard), md = fila completa (users manager) */
  size?: 'xs' | 'sm' | 'md';
  /** Si se provee, el bloque responde a long-press (abre dialog de info) y los clicks no propagan */
  onLongPress?: () => void;
  /** Texto de hint bajo el bloque cuando hay long-press (ej. "Mantén presionado para ver info") */
  hint?: string;
  /** Contenido extra junto al nombre (ej. badge "Inactivo") */
  nameExtra?: ReactNode;
  className?: string;
}

export function UserBadge({ user, size = 'md', onLongPress, hint, nameExtra, className }: UserBadgeProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const telegram = user.telegramUser ?? null;

  useEffect(() => {
    if (!telegram?.hasPhoto) return;
    let cancelled = false;
    apiQuery<{ success: boolean; dataUrl?: string }>('admin-telegram-photo', { userId: user.id })
      .then((data) => {
        if (!cancelled && data.success && data.dataUrl) {
          setPhotoUrl(data.dataUrl);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user.id, telegram?.hasPhoto]);

  const longPress = useLongPress({
    onLongPress: (e) => {
      e.stopPropagation();
      onLongPress?.();
    },
    onClick: (e) => e.stopPropagation(),
  });

  const telegramLabel = telegram ? `@${telegram.username || telegram.firstName || telegram.telegramId}` : null;
  const telegramHref = telegram ? `https://t.me/${telegram.username || telegram.telegramId}` : null;

  const avatarSize =
    size === 'xs' ? 'h-6 w-6 text-[10px]' : size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  const avatar = telegram ? (
    photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- data URL from server-decrypted Telegram photo
      <img src={photoUrl} alt={user.name} className={cn(avatarSize, 'shrink-0 rounded-full object-cover')} />
    ) : (
      <div
        className={cn(
          avatarSize,
          'bg-sky-500/10 text-sky-500 flex shrink-0 items-center justify-center rounded-full font-medium',
        )}
      >
        {(telegram.firstName || user.name).charAt(0).toUpperCase()}
      </div>
    )
  ) : null;

  const telegramLine =
    telegram && telegramHref ? (
      onLongPress ? (
        <span className="text-muted-foreground">{telegramLabel}</span>
      ) : (
        <a
          href={telegramHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-sky-500 inline-flex items-center gap-1.5 transition-colors"
        >
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
          {telegramLabel}
        </a>
      )
    ) : null;

  const content =
    size === 'md' ? (
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-medium">{user.name}</span>
            {nameExtra}
          </div>
          <p className="text-muted-foreground truncate text-sm">{user.email}</p>
          {telegram ? (
            <div className="truncate text-sm">{telegramLine}</div>
          ) : (
            <p className="text-muted-foreground/60 text-sm">Sin Telegram</p>
          )}
        </div>
      </div>
    ) : (
      <div className={cn('flex min-w-0 items-center', size === 'xs' ? 'gap-1' : 'gap-2')}>
        {avatar}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'text-foreground flex items-center gap-1.5 truncate leading-tight font-medium',
              size === 'xs' ? 'text-[11px] font-semibold' : 'text-sm',
            )}
          >
            <span className="truncate">{user.name}</span>
            {nameExtra}
          </div>
          <div className={cn('text-muted-foreground truncate leading-tight', size === 'xs' ? 'text-[9px]' : 'text-xs')}>
            {telegramLabel ? (
              <>
                {telegramLine}
                <span className="text-muted-foreground/50"> · </span>
                {user.email}
              </>
            ) : (
              user.email
            )}
          </div>
        </div>
      </div>
    );

  if (onLongPress) {
    return (
      <motion.div
        {...longPress}
        whileTap={{ scale: 0.98 }}
        className={cn('group relative touch-manipulation whitespace-normal select-none', className)}
      >
        {content}
        {hint && (
          <span className="text-muted-foreground block text-[10px] leading-none opacity-0 transition-opacity group-hover:opacity-50">
            ({hint})
          </span>
        )}
      </motion.div>
    );
  }

  return <div className={cn('min-w-0 whitespace-normal', className)}>{content}</div>;
}
