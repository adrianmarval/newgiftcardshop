'use client';

import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/utils';
import { useEffect } from 'react';

export default function NotificationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Notifications error:', error);
    reportClientError(error, 'buyer-notifications');
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1">
      <h2 className="text-2xl font-bold">Error loading notifications</h2>
      <p className="text-muted-foreground max-w-md text-center">{error.message}</p>
      <Button
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium transition-colors"
      >
        Try again
      </Button>
    </div>
  );
}
