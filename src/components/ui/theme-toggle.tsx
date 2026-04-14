'use client';
import { FaMoon, FaSun } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="outline" size="icon" className="rounded-full" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <FaMoon className="aboslute h10 w-10 scale-100 rotate-0 dark:scale-0 dark:rotate-90" />
      <FaSun className="absolute h-10 w-10 scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
    </Button>
  );
};
