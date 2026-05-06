import { Spinner } from '@/components/ui/spinner';

export default function AdminDashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-8 md:size-16" />
    </div>
  );
}
