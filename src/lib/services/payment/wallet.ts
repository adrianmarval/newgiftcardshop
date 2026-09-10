// ─────────────────────────────────────────────────────────────────────────────
// Wallet Service — PaymentMethod del seller (destino de payouts).
// ÚNICA fuente de verdad: lo consumen las actions web
// (actions/seller/payment-method) y el seller-bot (handlers/wallet-handler).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { getCoinWithNetworks, validateWalletAddress } from '@/lib/services/coin';

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export interface UpsertWalletInput {
  userId: string;
  coinId: string;
  networkId: string;
  address: string;
  isBinanceWallet: boolean;
}

const walletInclude = { coin: true, network: true } as const;

export async function getWallet(userId: string) {
  return prisma.paymentMethod.findUnique({
    where: { userId },
    include: walletInclude,
  });
}

/**
 * Crea o actualiza la wallet del seller. Valida que el par coin+network exista
 * y que la address matchee el regex de la red ANTES de persistir.
 */
export async function upsertWallet(input: UpsertWalletInput) {
  const { userId, coinId, networkId, address, isBinanceWallet } = input;

  const coin = await getCoinWithNetworks(coinId);
  if (!coin) throw new WalletError('Invalid coin');

  const networkLink = coin.networks.find((cn) => cn.networkId === networkId);
  if (!networkLink) throw new WalletError('Network not linked to this coin');

  if (!validateWalletAddress(address, networkLink.network.regex)) {
    throw new WalletError(`Invalid wallet address for ${networkLink.network.name}`);
  }

  return prisma.paymentMethod.upsert({
    where: { userId },
    create: { userId, coinId, networkId, address, isBinanceWallet },
    update: { coinId, networkId, address, isBinanceWallet },
    include: walletInclude,
  });
}

export async function deleteWallet(userId: string): Promise<void> {
  await prisma.paymentMethod.deleteMany({ where: { userId } });
}
