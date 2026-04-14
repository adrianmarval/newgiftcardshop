import { Spinner } from '@/components/ui/spinner';

export default function SellerDashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
