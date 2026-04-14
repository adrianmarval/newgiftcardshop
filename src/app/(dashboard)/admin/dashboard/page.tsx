import { IconUsers, IconCreditCard, IconCurrencyDollar, IconAlertTriangle } from '@tabler/icons-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel de Administración | Solmaira Cards',
  description: 'Vista general de la plataforma, gestión de usuarios y análisis para Solmaira Cards',
};

export default async function AdminDashboardPage() {
  return (
    <div>
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Resumen y gestión de la plataforma</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            <span className="text-base font-medium">Usuarios Totales</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCreditCard className="h-5 w-5" />
            <span className="text-base font-medium">Tarjetas Listadas</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCurrencyDollar className="h-5 w-5" />
            <span className="text-base font-medium">Ingresos</span>
          </div>
          <span className="text-4xl font-bold">$0.00</span>
        </div>
      </div>

      <div className="bg-muted/50 min-h-100 flex-1 rounded-xl p-6">
        <h2 className="mb-4 text-2xl font-semibold">Actividad de la Plataforma</h2>
        <p className="text-muted-foreground">Sin actividad reciente.</p>
      </div>
    </div>
  );
}
