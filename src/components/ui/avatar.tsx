import * as React from 'react';

import { cn } from '@/lib/utils';

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

function Avatar({ className, src, alt, name, size = 'md', ...props }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  return (
    <div
      data-slot="avatar"
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-muted items-center justify-center font-medium',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}

export { Avatar };