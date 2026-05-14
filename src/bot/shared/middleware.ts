import type { NextFunction } from 'grammy';
import type { SellerContext, BuyerContext } from './types.js';
import prisma from '@/lib/prisma';
import { renderUI } from './ui.js';

const ADMIN_USERNAME = process.env.ADMIN_TELEGRAM_USERNAME ?? '';

// ── Sequentialize middleware ──────────────────────────────────────────────────
const locks = new Map<string, Promise<void>>();

export function sequentialize(getSessionKey: (ctx: any) => string | undefined) {
  return async (ctx: any, next: NextFunction) => {
    const key = getSessionKey(ctx);
    if (!key) return next();

    const current = locks.get(key) || Promise.resolve();
    let resolveLock!: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    const lockPromise = current.then(() => nextPromise);
    locks.set(key, lockPromise);

    await current;
    try {
      await next();
    } finally {
      resolveLock();
      if (locks.get(key) === lockPromise) {
        locks.delete(key);
      }
    }
  };
}

// ── Seller middleware ─────────────────────────────────────────────────────────

export const authenticateSeller = async (ctx: SellerContext, next: NextFunction) => {
  if (!ctx.from) return renderUI(ctx, '❌ Error inesperado. Intentá de nuevo.');

  const telegramId = ctx.from.id.toString();

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return renderUI(
      ctx,
      '🔗 <b>Your account is not linked.</b>\n\n' + `Ask the administrator (@${ADMIN_USERNAME}) to send you your access link.`,
      { parse_mode: 'HTML' },
    );
  }

  if (!user.isActive) {
    return renderUI(ctx, '⏸ <b>Your account is deactivated.</b>\n\n' + `Contact @${ADMIN_USERNAME} to activate it.`, { parse_mode: 'HTML' });
  }

  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    return renderUI(ctx, '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot.', {
      parse_mode: 'HTML',
    });
  }

  ctx.user = user as any;
  await next();
};

// ── Buyer middleware ──────────────────────────────────────────────────────────

export const authenticateBuyer = async (ctx: BuyerContext, next: NextFunction) => {
  if (!ctx.from) return renderUI(ctx, '❌ Error inesperado. Intentá de nuevo.');

  const telegramId = ctx.from.id.toString();

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return renderUI(ctx, '🔗 <b>Tu cuenta no está vinculada.</b>\n\n' + `Contactá a @${ADMIN_USERNAME} para obtener acceso.`, {
      parse_mode: 'HTML',
    });
  }

  if (!user.isActive) {
    return renderUI(ctx, '⏸ <b>Tu cuenta está desactivada.</b>\n\n' + `Contactá a @${ADMIN_USERNAME} para activarla.`, { parse_mode: 'HTML' });
  }

  if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
    return renderUI(ctx, '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot.', {
      parse_mode: 'HTML',
    });
  }

  ctx.user = user as any;
  await next();
};
