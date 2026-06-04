import { NotificationsView } from '@/components/notifications/notifications-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Consola de Alertas | Panel Administrador',
  description: 'Auditoría de nuevos lotes, confirmaciones de pago pendientes y control de inventario.',
};

export default function AdminNotificationsPage() {
  return (
    <div className="w-full space-y-1 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Consola de Operaciones</h1>
        <p className="text-muted-foreground text-sm">
          Monitoreá las solicitudes críticas de usuarios, auditorías de lotes e inventario del sitio.
        </p>
      </div>
      <div className="mt-4">
        <NotificationsView portal="admin" />
      </div>
    </div>
  );
}
