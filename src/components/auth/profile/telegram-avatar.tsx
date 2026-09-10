import * as React from 'react';

import { cn } from '@/lib/ui';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function TelegramAvatar({ className, src, alt, name, size = 'md', ...props }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  if (src) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div
            data-slot="avatar"
            className={cn(
              'bg-muted relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full font-medium',
              sizeClasses[size],
              className,
            )}
            {...props}
          >
            <Image src={src} alt={alt || name || 'Avatar'} fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
              <span className="text-xs font-medium text-white">Ver</span>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent showCloseButton={true} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>Telegram profile picture</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square w-full">
            <Image src={src} fill className="object-contain" alt={alt || name || 'Avatar'} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div
      data-slot="avatar"
      className={cn(
        'bg-muted relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <span className="select-none">{initials}</span>
    </div>
  );
}

export { TelegramAvatar };
