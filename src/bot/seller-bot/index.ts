import { Bot, session } from 'grammy';
import { PrismaAdapter } from '@grammyjs/storage-prisma';
import { limit } from '@grammyjs/ratelimiter';
import { InlineKeyboard } from 'grammy';
import type { SellerContext, SellerSessionData } from '@/bot/shared/types.js';
import prisma from '@/lib/prisma';
import { authenticateSeller } from '@/bot/shared/middleware.js';
import { startSeller } from './handlers/start.handler.js';
import { handleStats } from './handlers/stats.handler.js';
import { handleBatches, handleViewBatch } from './handlers/batches.handler.js';
import {
  startSellWizard,
  handleBrandSelected,
  handleCountrySelected,
  handleCodesText,
  handleSellConfirm,
  handleSellCancel,
} from './handlers/sell.handler.js';
import {
  handleRegName,
  handleRegEmail,
  handleRegOtp,
  handleRegPassword,
} from '@/bot/shared/registration.js';

export function createSellerBot() {
  const token = process.env.SELLER_BOT_TOKEN;
  if (!token) throw new Error('SELLER_BOT_TOKEN is not defined in environment variables');

  const bot = new Bot<SellerContext>(token);

  // setMyCommands es best-effort: si falla (token inválido, sin red) no bloquea
  void bot.api
    .setMyCommands([
      { command: 'start', description: 'Main menu' },
      { command: 'sell', description: 'Publish giftcards' },
      { command: 'batches', description: 'View my batches' },
      { command: 'stats', description: 'View my statistics' },
      { command: 'help', description: 'Help' },
    ])
    .catch((err) => console.warn('[SellerBot] setMyCommands failed (non-critical):', err.message));

  // ── Middlewares globales ───────────────────────────────────────────────────
  bot.use(
    limit(),
    session<SellerSessionData, SellerContext>({
      initial: (): SellerSessionData => ({
        wizard: { step: 'idle' },
        storedMessageIds: [],
      }),
      storage: new PrismaAdapter<SellerSessionData>(prisma.botSession as any),
      getSessionKey: (ctx) =>
        ctx.from ? `seller:${ctx.from.id}` : undefined,
    }),
  );

  // ── /start y wizard de registro (sin auth — cualquier user puede registrarse) ──
  bot.command('start', startSeller);

  // Pasos del wizard de registro: capturan texto ANTES del auth middleware
  bot.on(':text', async (ctx, next) => {
    const step = ctx.session.wizard.step;
    if (step === 'awaitingName')     return handleRegName(ctx, 'SELLER');
    if (step === 'awaitingEmail')    return handleRegEmail(ctx, 'SELLER');
    if (step === 'awaitingOtp')      return handleRegOtp(ctx, 'SELLER', () => startSeller(ctx));
    if (step === 'awaitingPassword') return handleRegPassword(ctx, 'SELLER');
    // Resto de steps → pasan al siguiente handler (que ya requiere auth)
    return next();
  });

  // ── Todos los demás requieren cuenta vinculada y rol SELLER ───────────────
  bot.use(authenticateSeller);

  // ── Comandos ──────────────────────────────────────────────────────────────
  bot.command('sell', startSellWizard);
  bot.command('batches', handleBatches);
  bot.command('stats', handleStats);
  bot.command('help', (ctx) =>
    ctx.reply(
      '📋 <b>Available commands:</b>\n\n' +
        '/sell — Publish giftcards\n' +
        '/batches — View your published batches\n' +
        '/stats — View your sales statistics\n\n' +
        '<i>Use the buttons to navigate through the menus.</i>',
      { parse_mode: 'HTML' },
    ),
  );

  // ── Callback queries ──────────────────────────────────────────────────────

  // Menú principal
  bot.callbackQuery('start', startSeller as any);

  // Sell flow
  bot.callbackQuery('sell_start', startSellWizard);
  bot.callbackQuery(/^sell_brand_/, handleBrandSelected);
  bot.callbackQuery(/^sell_country_/, handleCountrySelected);
  bot.callbackQuery('sell_confirm', handleSellConfirm);
  bot.callbackQuery('sell_cancel', handleSellCancel);

  // Batches
  bot.callbackQuery(/^my_batches(_\d+)?$/, handleBatches);
  bot.callbackQuery(/^view_batch_/, handleViewBatch);

  // ── Mensajes de texto post-auth (wizard de venta) ────────────────────────
  bot.on(':text', handleCodesText);

  // ── Error handler ─────────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error('[SellerBot] Error:', err.message, err.ctx?.update);
    err.ctx
      ?.reply('❌ An unexpected error occurred. Please try again or use /start.')
      .catch(() => {});
  });

  const webhookPath = `/api/bot/seller/${token.split(':')[0]}`;

  return { bot, webhookPath };
}
