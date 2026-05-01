'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <NuqsAdapter>{children}</NuqsAdapter>
      </NextThemesProvider>
    </TooltipProvider>
  );
}
