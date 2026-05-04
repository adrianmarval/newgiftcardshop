'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency-formatter';
import { AlertTriangle, Bitcoin, DollarSign, Equal, TrendingDown, TrendingUp } from 'lucide-react';
import { AdminDepositDialog, AdminRefundDialog, AdminWithdrawDialog } from '../admin/payments/dialogs';
import { Decimal } from '@/generated/prisma/internal/prismaNamespaceBrowser';


interface BalanceCardProps {
  platformBalance: number | string | typeof Decimal;
  binanceBalance: string | number | typeof Decimal;
  error?: string;
}

export const BalanceCard = ({ platformBalance, binanceBalance, error }: BalanceCardProps) => {
  let safePlatformBal = new Decimal(0);
  let safeBinanceBal = new Decimal(0);

  try {
    if (platformBalance !== undefined && platformBalance !== null) {
      safePlatformBal = new Decimal(platformBalance.toString());
    }
  } catch (e) {}

  try {
    if (binanceBalance !== undefined && binanceBalance !== null) {
      safeBinanceBal = new Decimal(binanceBalance.toString());
    }
  } catch (e) {}

  const differential = safeBinanceBal.minus(safePlatformBal);
  const diffColor = differential.greaterThan(0) ? 'text-green-400' : differential.lessThan(0) ? 'text-red-400' : 'text-white/80';

  return (
    <Card className="relative overflow-hidden border-none bg-transparent bg-linear-to-br from-blue-400 to-purple-400 p-4 font-sans text-white shadow-xl before:absolute before:top-[-80px] before:right-[-80px] before:z-10 before:h-40 before:w-40 before:rounded-full before:bg-white/10 before:content-[''] after:absolute after:bottom-[-64px] after:left-[-64px] after:z-10 after:h-32 after:w-32 after:rounded-full after:bg-white/10 after:content-['']">
      <DollarSign className="absolute top-5 right-5 z-0 opacity-40" size={38} strokeWidth={2} />

      <CardContent className="relative z-20 space-y-3 p-0">
        <div className="ml-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-white/80">Platform Balance</p>
            <p className="text-lg font-semibold drop-shadow-sm">{formatCurrency(safePlatformBal.toNumber())}</p>
          </div>
        </div>
        <div className="h-px w-full bg-white/20"></div>
        {/* Balance Binance + Diferencial */}
        <div className="flex items-start justify-between">
          {/* Balance Binance */}
          <div className="flex items-center">
            <Bitcoin className="mr-2 text-yellow-300" size={18} strokeWidth={2} />
            <div>
              <p className="text-xs font-medium text-white/80">Binance USDT Balance</p>
              {error ? (
                <div className="flex min-h-[28px] items-center text-sm text-red-200">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  Error Fetching
                </div>
              ) : (
                <p className="min-h-[28px] text-lg font-semibold drop-shadow-sm">{formatCurrency(safeBinanceBal.toNumber())}</p>
              )}
            </div>
          </div>
          {/* Diferencial */}
          <div className="flex flex-col items-end">
            <p className="text-xs font-medium text-white/80">Differential</p>
            {error ? (
              <span className="text-sm text-white/70">—</span>
            ) : (
              <div className={`flex items-center text-base font-semibold ${diffColor}`}>
                {differential.greaterThan(0) ? (
                  <TrendingUp className="mr-1 h-4 w-4" />
                ) : differential.lessThan(0) ? (
                  <TrendingDown className="mr-1 h-4 w-4" />
                ) : (
                  <Equal className="mr-1 h-4 w-4" />
                )}
                <span className="drop-shadow-sm">{formatCurrency(differential.abs().toNumber())}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-around gap-2 bg-transparent">
        <AdminDepositDialog />
        <AdminWithdrawDialog />
        <AdminRefundDialog />
      </CardFooter>
    </Card>
  );
};
