import type { Bot } from 'grammy';
import type { BuyerContext, SellerContext } from '@/bot/shared/types';

type BuyerBot = Bot<BuyerContext>;
type SellerBot = Bot<SellerContext>;

interface BotRegistryGlobal {
  buyerBot: BuyerBot | null;
  sellerBot: SellerBot | null;
}

const globalForBots = globalThis as unknown as {
  __botRegistry?: BotRegistryGlobal;
};

const registry: BotRegistryGlobal = globalForBots.__botRegistry ?? {
  buyerBot: null,
  sellerBot: null,
};

if (process.env.NODE_ENV !== 'production') {
  globalForBots.__botRegistry = registry;
}

export const BotRegistry = {
  registerBuyerBot(bot: BuyerBot): void {
    registry.buyerBot = bot;
  },
  registerSellerBot(bot: SellerBot): void {
    registry.sellerBot = bot;
  },
  getBuyerBot(): BuyerBot | null {
    return registry.buyerBot;
  },
  getSellerBot(): SellerBot | null {
    return registry.sellerBot;
  },
  isBotAvailable(role: 'BUYER' | 'SELLER'): boolean {
    return role === 'BUYER' ? registry.buyerBot !== null : registry.sellerBot !== null;
  },
};
