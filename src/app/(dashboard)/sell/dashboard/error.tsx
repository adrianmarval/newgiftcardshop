"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function SellerDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Seller dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md">{error.message}</p>
      <Button
        onClick={reset}
        className="rounded-lg bg-primary px-6 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        Try again
      </Button>
    </div>
  );
}
