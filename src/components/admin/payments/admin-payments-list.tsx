'use client';

import { History, ArrowUpRight, ArrowDownRight, Banknote, RotateCcw } from 'lucide-react';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminPayment } from '@/types/domain/admin';
import type { AdminPaymentsListProps } from './types';

const categoryConfig: Record<string, { label: string; icon: typeof ArrowUpRight; badge: string }> = {
  ORDER: { label: 'Orden', icon: ArrowUpRight, badge: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950' },
  BATCH: { label: 'Batch', icon: ArrowDownRight, badge: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950' },
  DEPOSIT: { label: 'Depósito', icon: Banknote, badge: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-950' },
  REFUND_BUYER: { label: 'Refund Buyer', icon: RotateCcw, badge: 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-950' },
  REFUND_SELLER: {
    label: 'Refund Seller',
    icon: RotateCcw,
    badge: 'text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-950',
  },
};

export const AdminPaymentsList = ({ payments, totalPages }: AdminPaymentsListProps) => {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<History className="text-muted-foreground/20 h-12 w-12" />}
        title="No se encontraron pagos"
        description="Intenta ajustar tus filtros o palabras clave de búsqueda."
      />
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Fecha</th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Tipo</th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Usuario</th>
                <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">Monto</th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Ref</th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Binance Tx</th>
                <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => {
                return (
                  <tr key={payment.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const cat = categoryConfig[payment.category] ?? categoryConfig.ORDER;
                        const CatIcon = cat.icon;
                        return (
                          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cat.badge}`}>
                            <CatIcon className="h-3 w-3" />
                            {cat.label}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{payment.relatedUserName || 'N/A'}</p>
                        <p className="text-muted-foreground text-xs">{payment.relatedUserEmail || '-'}</p>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${
                        payment.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {payment.direction === 'CREDIT' ? '+' : '-'}${Math.abs(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.referenceType && payment.referenceId ? (
                        <span className="bg-muted rounded px-1.5 py-0.5 text-xs">
                          {payment.referenceType}:{payment.referenceId.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.binanceTxId ? (
                        <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{payment.binanceTxId.slice(-10)}...</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right text-sm">${payment.balanceAfter.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <UrlPagination totalPages={totalPages} />
    </>
  );
};
