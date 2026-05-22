import { NotificationsView } from '@/components/notifications/notifications-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Centro de Alertas | Portal Ventas',
  description: 'Seguí el estado de tus lotes vendidos, confirmaciones de pago y límites de volumen KYC.',
};

export default function SellerNotificationsPage() {
  return (
    <div className="w-full space-y-4 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Alertas de Venta</h1>
        <p className="text-sm text-muted-foreground">
          Seguí tus liquidaciones de pagos y el estado de auditoría de tus lotes.
        </p>
      </div>
      <div className="mt-4">
        <NotificationsView portal="seller" />
      </div>
    </div>
  );
}
