import type { NextFunction } from 'grammy';
import type { SellerContext, BuyerContext } from './types.js';
import prisma from '@/lib/prisma';

const ADMIN_USERNAME = process.env.ADMIN_TELEGRAM_USERNAME ?? '';

// ── Seller middleware ─────────────────────────────────────────────────────────

export const authenticateSeller = async (ctx: SellerContext, next: NextFunction) => {
  if (!ctx.from) return ctx.reply('❌ Error inesperado. Intentá de nuevo.');

  const telegramId = ctx.from.id.toString();

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return ctx.reply(
      '🔗 <b>Tu cuenta no está vinculada.</b>\n\n' +
        `Pedile al administrador (@${ADMIN_USERNAME}) que te envíe tu link de acceso.`,
      { parse_mode: 'HTML' },
    );
  }

  if (!user.isActive) {
    return ctx.reply(
      '⏸ <b>Tu cuenta está desactivada.</b>\n\n' +
        `Contactá a @${ADMIN_USERNAME} para activarla.`,
      { parse_mode: 'HTML' },
    );
  }

  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    return ctx.reply('🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot.', {
      parse_mode: 'HTML',
    });
  }

  ctx.user = user as any;
  await next();
};

// ── Buyer middleware ──────────────────────────────────────────────────────────

export const authenticateBuyer = async (ctx: BuyerContext, next: NextFunction) => {
  if (!ctx.from) return ctx.reply('❌ Error inesperado. Intentá de nuevo.');

  const telegramId = ctx.from.id.toString();

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return ctx.reply(
      '🔗 <b>Tu cuenta no está vinculada.</b>\n\n' +
        `Contactá a @${ADMIN_USERNAME} para obtener acceso.`,
      { parse_mode: 'HTML' },
    );
  }

  if (!user.isActive) {
    return ctx.reply(
      '⏸ <b>Tu cuenta está desactivada.</b>\n\n' +
        `Contactá a @${ADMIN_USERNAME} para activarla.`,
      { parse_mode: 'HTML' },
    );
  }

  if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
    return ctx.reply('🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot.', {
      parse_mode: 'HTML' },
    );
  }

  ctx.user = user as any;
  await next();
};
