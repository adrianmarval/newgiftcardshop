import { NotificationsView } from '@/components/notifications/notifications-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Centro de Alertas | Portal Compras',
  description: 'Gestioná tus notificaciones de stock, vencimiento de pagos y entrega de códigos.',
};

export default function BuyerNotificationsPage() {
  return (
    <div className="w-full space-y-4 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Notificaciones</h1>
        <p className="text-sm text-muted-foreground">
          Seguí el estado de tus compras y alertas de marcas disponibles en tiempo real.
        </p>
      </div>
      <div className="mt-4">
        <NotificationsView portal="buyer" />
      </div>
    </div>
  );
}
