import { z } from 'zod';
import { IconHourglassHigh } from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getCountryFlag } from '@/lib/utils';
import type { getStockAgingReportOutputSchema } from '@/actions/admin/stats/schemas';

type StockAgingRow = z.infer<typeof getStockAgingReportOutputSchema>[number];

// Colores por severidad de antigüedad (mismo criterio que los buckets del action)
const BUCKET_SEVERITY: Record<string, string> = {
  '<1h': 'text-muted-foreground',
  '1-6h': 'text-muted-foreground',
  '6-24h': 'text-amber-500',
  '1-3d': 'text-orange-500',
  '>3d': 'text-red-500',
};

function formatAge(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/**
 * Reporte de antigüedad de inventario (read-only, server-rendered).
 * Filas ordenadas por la tarjeta más vieja primero — lo más varado arriba.
 */
export function StockAgingTable({ data }: { data: StockAgingRow[] }) {
  return (
    <Card className="bg-muted/50 gap-1">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
          <IconHourglassHigh className="h-5 w-5" />
          Stock Aging
        </CardTitle>
        <CardDescription>Antigüedad del inventario en stock por marca/país — lo más varado primero</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Sin inventario en stock</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="py-2 pr-4 font-medium">Marca • País</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  {data[0]?.buckets.map((b) => (
                    <th key={b.range} className="py-2 pr-4 font-medium whitespace-nowrap">
                      {b.range}
                    </th>
                  ))}
                  <th className="py-2 font-medium whitespace-nowrap">Más vieja</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.brandCountryId} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {getCountryFlag(row.countryCode)} {row.brandName} • {row.countryName}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {row.totalCards} · {formatCurrency(row.totalAmount)}
                    </td>
                    {row.buckets.map((b) => (
                      <td key={b.range} className={`py-2 pr-4 whitespace-nowrap ${b.count > 0 ? BUCKET_SEVERITY[b.range] : 'text-muted-foreground/40'}`}>
                        {b.count > 0 ? `${b.count} · ${formatCurrency(b.total)}` : '—'}
                      </td>
                    ))}
                    <td className={`py-2 font-medium whitespace-nowrap ${row.oldestHours >= 24 ? 'text-red-500' : row.oldestHours >= 6 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {formatAge(row.oldestHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
