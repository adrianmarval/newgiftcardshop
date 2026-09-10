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

// ── Auth middleware (parametrizado por rol) ───────────────────────────────────

type BotRole = 'SELLER' | 'BUYER';

const ROLE_COPY: Record<
  BotRole,
  { notLinked: string; deactivated: string; denied: string; allowedRoles: string[] }
> = {
  SELLER: {
    allowedRoles: ['SELLER', 'ADMIN'],
    notLinked:
      '🔗 <b>Your account is not linked.</b>\n\nIf your account is active, try again in a few seconds or contact @',
    deactivated: '⏸ <b>Your account is deactivated.</b>\n\n',
    denied: '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot.',
  },
  BUYER: {
    allowedRoles: ['BUYER', 'ADMIN'],
    notLinked:
      '🔗 <b>Tu cuenta no está vinculada.</b>\n\nSi tu cuenta está activa, intenta de nuevo en unos segundos o contacta a @',
    deactivated: '⏸ <b>Tu cuenta está desactivada.</b>\n\n',
    denied: '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot.',
  },
};

function authenticate(role: BotRole) {
  const copy = ROLE_COPY[role];
  const label = role.toLowerCase();

  return async (ctx: SellerContext | BuyerContext, next: NextFunction) => {
    // Usuarios en wizard de registro no necesitan auth — el wizard es self-service
    // Los flujos post-auth SÍ la requieren (necesitan ctx.user.id)
    if ((REG_WIZARD_STEPS as readonly string[]).includes(ctx.session.wizard.step)) return next();

    if (!ctx.from) return renderUI(ctx, '❌ Error inesperado. Intentá de nuevo.');

    const telegramId = ctx.from.id.toString();
    const userInclude = { user: { select: { id: true, name: true, role: true, isActive: true } } } as const;

    let telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId },
      include: userInclude,
    });

    // Retry una vez si la query falla transitoriamente (DB pool agotado, alta carga por notificaciones masivas)
    if (!telegramUser) {
      logger.warn(`[Auth] TelegramUser no encontrado para ${label} ${telegramId}, reintentando...`);
      await new Promise((r) => setTimeout(r, 100));
      telegramUser = await prisma.telegramUser.findUnique({
        where: { telegramId },
        include: userInclude,
      });
      if (telegramUser) {
        logger.info(`[Auth] TelegramUser encontrado en retry para ${label} ${telegramId}`);
      }
    }

    const user = telegramUser?.user;

    if (!user) {
      logger.warn(`[Auth] ${role} no vinculado: telegramId=${telegramId}, telegramUserExiste=${!!telegramUser}`);
      return renderUI(ctx, copy.notLinked + ADMIN_USERNAME + '.', { parse_mode: 'HTML' });
    }

    if (!user.isActive) {
      const contact = role === 'SELLER' ? `Contact @${ADMIN_USERNAME} to activate it.` : `Contacta a @${ADMIN_USERNAME} para activarla.`;
      return renderUI(ctx, copy.deactivated + contact, { parse_mode: 'HTML' });
    }

    if (!copy.allowedRoles.includes(user.role)) {
      return renderUI(ctx, copy.denied, { parse_mode: 'HTML' });
    }

    ctx.user = user as any;
    await next();
  };
}

export const authenticateSeller = authenticate('SELLER');
export const authenticateBuyer = authenticate('BUYER');
