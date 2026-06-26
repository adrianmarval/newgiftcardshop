'use client';

import { useTheme } from '@/hooks/use-theme';
import { FaMoon, FaSun } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/ui';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'icon-only';
}

export const ThemeToggle = ({ className, variant = 'default' }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full',
        variant === 'icon-only' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <FaSun className="h-6 w-6 scale-100 rotate-0 transition-all duration-300" />
      ) : (
        <FaMoon className="h-6 w-6 scale-100 rotate-0 transition-all duration-300" />
      )}
    </Button>
  );
};