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

// SIEMPRE asignar (no solo en dev): en producción webpack DUPLICA este módulo
// en varios chunks y server.ts (que registra los bots) corre vía tsx con otro
// module graph. globalThis es lo único compartido — con la asignación solo en
// dev, las copias del bundle de Next quedaban VACÍAS en producción y las
// notificaciones Telegram disparadas desde server actions web se saltaban en
// silencio (solo llegaban las originadas en crons/bots del graph de tsx).
globalForBots.__botRegistry = registry;

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
