'use client';

import { History, ArrowUpRight, ArrowDownRight, Copy } from 'lucide-react';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminPayment } from '@/types/domain/admin';
import type { AdminPaymentsListProps } from './types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { showAlert } from '@/lib/swal';

const categoryConfig: Record<string, { label: string; icon: typeof ArrowUpRight; badge: string }> = {
  ORDER: { label: 'Orden', icon: ArrowUpRight, badge: 'text-green-700 bg-green-600/10 dark:text-green-400 dark:bg-green-400/10' },
  BATCH: { label: 'Batch', icon: ArrowDownRight, badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10' },
  DEPOSIT: {
    label: 'Depósito',
    icon: ArrowUpRight,
    badge: 'text-green-700 bg-green-600/10 dark:text-green-400 dark:bg-green-400/10',
  },
  REFUND_BUYER: {
    label: 'Refund Buyer',
    icon: ArrowDownRight,
    badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10',
  },
  REFUND_SELLER: {
    label: 'Refund Seller',
    icon: ArrowDownRight,
    badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10',
  },
  WITHDRAWAL: {
    label: 'Retiro',
    icon: ArrowDownRight,
    badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10',
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert.toast.success(`${label} copiado`);
  };

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
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
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
                      <div className="min-w-[120px]">
                        <p className="truncate font-medium">{payment.relatedUserName || 'N/A'}</p>
                        <p className="text-muted-foreground truncate text-xs">{payment.relatedUserEmail || '-'}</p>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="bg-muted hover:bg-muted-foreground/10 cursor-pointer rounded px-1.5 py-0.5 text-xs transition-colors"
                              onClick={() => handleCopy(payment.referenceId!, 'ID')}
                            >
                              {payment.referenceType}:{payment.referenceId.slice(-6)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-col gap-1 p-1">
                              <span className="text-muted-foreground text-[10px]">Click para copiar ID completo</span>
                              <span className="font-mono text-xs">{payment.referenceId}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.binanceTxId ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="bg-muted hover:bg-muted-foreground/10 cursor-pointer rounded px-1.5 py-0.5 font-mono text-xs transition-colors"
                              onClick={() => handleCopy(payment.binanceTxId!, 'TX ID')}
                            >
                              {payment.binanceTxId.slice(-10)}...
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-col gap-1 p-1">
                              <span className="text-muted-foreground text-[10px]">Click para copiar TX completo</span>
                              <span className="font-mono text-xs">{payment.binanceTxId}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
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
