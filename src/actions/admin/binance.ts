'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/services/binance.service';
import { Asset, Network } from '@/types';
import z from 'zod';

export const getBinanceBalancesAction = adminActionClient.action(async () => {
  return await binance.getUsdtBalances();
});

export const withdrawBalanceAction = adminActionClient.inputSchema(z.object({ amount: z.number() })).action(async ({ parsedInput }) => {
  const WITHDRAW_WALLET = process.env.WITHDRAW_WALLET;
  const WITHDRAW_COIN = process.env.WITHDRAW_COIN as Asset;
  const WITHDRAW_NETWORK = process.env.WITHDRAW_NETWORK as Network;

  if (!WITHDRAW_WALLET || !WITHDRAW_COIN || !WITHDRAW_NETWORK) {
    throw new Error('WITHDRAW_WALLET or WITHDRAW_COIN or WITHDRAW_NETWORK is not defined');
  }

  const { amount } = parsedInput;
  return await binance.withdrawFunds({
    address: WITHDRAW_WALLET,
    amount: amount.toLocaleString(),
    coin: WITHDRAW_COIN,
    transactionFeeFlag: true,
    walletType: 1,
    network: WITHDRAW_NETWORK,
  });
});
