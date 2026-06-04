'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: React.ErrorInfo; reset: () => void }) {
  useEffect(() => {
    console.error('Orders page error:', error);
  }, [error]);

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-1 p-4">
      <AlertTriangle className="text-destructive h-12 w-12" />
      <h2 className="text-xl font-bold">Something went wrong loading orders</h2>
      <button onClick={reset} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 font-bold">
        Try again
      </button>
    </div>
  );
}
