import type { NextFunction } from 'grammy';
import type { SellerContext, BuyerContext } from './types.js';
import { REG_WIZARD_STEPS } from './types.js';
import prisma from '@/lib/prisma';
import { renderUI } from './ui.js';
import { logger } from '@/lib/logger';

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
  // Usuarios en wizard de registro no necesitan auth — el wizard es self-service
  // Flow de venta y wallet SÍ requieren auth (necesitan ctx.user.id)
  if ((REG_WIZARD_STEPS as readonly string[]).includes(ctx.session.wizard.step)) return next();

  if (!ctx.from) return renderUI(ctx, '❌ Error inesperado. Intentá de nuevo.');

  const telegramId = ctx.from.id.toString();

  let telegramUser = await prisma.telegramUser.findUnique({
    where: { telegramId },
    include: { user: { select: { id: true, name: true, role: true, isActive: true } } },
  });

  // Retry una vez si la query falla transitoriamente (DB pool agotado, alta carga por notificaciones masivas)
  if (!telegramUser) {
    logger.warn(`[Auth] TelegramUser no encontrado para seller ${telegramId}, reintentando...`);
    await new Promise((r) => setTimeout(r, 100));
    telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: { select: { id: true, name: true, role: true, isActive: true } } },
    });
    if (telegramUser) {
      logger.info(`[Auth] TelegramUser encontrado en retry para seller ${telegramId}`);
    }
  }

  const user = telegramUser?.user;

  if (!user) {
    logger.warn(`[Auth] Seller no vinculado: telegramId=${telegramId}, telegramUserExiste=${!!telegramUser}`);
    return renderUI(
      ctx,
      '🔗 <b>Your account is not linked.</b>\n\nIf your account is active, try again in a few seconds or contact @' +
        ADMIN_USERNAME +
        '.',
      { parse_mode: 'HTML' },
    );
  }

  if (!user.isActive) {
    return renderUI(ctx, '⏸ <b>Your account is deactivated.</b>\n\n' + `Contact @${ADMIN_USERNAME} to activate it.`, {
      parse_mode: 'HTML',
    });
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
  // Usuarios en wizard de registro no necesitan auth — el wizard es self-service
  // Flow de compra SÍ requiere auth (necesita ctx.user.id)
  if ((REG_WIZARD_STEPS as readonly string[]).includes(ctx.session.wizard.step)) return next();

  if (!ctx.from) return renderUI(ctx, '❌ Error inesperado. Intentá de nuevo.');

  const telegramId = ctx.from.id.toString();

  let telegramUser = await prisma.telegramUser.findUnique({
    where: { telegramId },
    include: { user: { select: { id: true, name: true, role: true, isActive: true } } },
  });

  // Retry una vez si la query falla transitoriamente (DB pool agotado, alta carga por notificaciones masivas)
  if (!telegramUser) {
    logger.warn(`[Auth] TelegramUser no encontrado para ${telegramId}, reintentando...`);
    await new Promise((r) => setTimeout(r, 100));
    telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: { select: { id: true, name: true, role: true, isActive: true } } },
    });
    if (telegramUser) {
      logger.info(`[Auth] TelegramUser encontrado en retry para ${telegramId}`);
    }
  }

  const user = telegramUser?.user;

  if (!user) {
    logger.warn(`[Auth] Buyer no vinculado: telegramId=${telegramId}, telegramUserExiste=${!!telegramUser}`);
    return renderUI(
      ctx,
      '🔗 <b>Tu cuenta no está vinculada.</b>\n\nSi tu cuenta está activa, intentá de nuevo en unos segundos o contactá a @' +
        ADMIN_USERNAME +
        '.',
      { parse_mode: 'HTML' },
    );
  }

  if (!user.isActive) {
    return renderUI(ctx, '⏸ <b>Tu cuenta está desactivada.</b>\n\n' + `Contactá a @${ADMIN_USERNAME} para activarla.`, {
      parse_mode: 'HTML',
    });
  }

  if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
    return renderUI(ctx, '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot.', {
      parse_mode: 'HTML',
    });
  }

  ctx.user = user as any;
  await next();
};
