import { Bot, session } from 'grammy';
import { PrismaAdapter } from '@grammyjs/storage-prisma';
import { limit } from '@grammyjs/ratelimiter';
import type { BuyerContext, BuyerSessionData } from '@/bot/shared/types.js';
import prisma from '@/lib/prisma';
import { authenticateBuyer } from '@/bot/shared/middleware.js';
import { startBuyer } from './handlers/start.handler.js';
import {
  handleOrders,
  handleOrderDetail,
  handleConfirmUsage,
  handleCancelOrder,
  handleMakePayment,
  handlePaymentText,
  handleReportIssues,
  handleReportCardSelect,
  handleReportModify,
  handleReportDelete,
  handleReportTypeSelect,
  handleReportAmountText,
  handleReportProofPhoto,
  handleReportProofSkip,
} from './handlers/orders.handler.js';
import {
  startBuyWizard,
  handleBuyBrandSelected,
  handleBuyCountrySelected,
  handleAmountText,
  handleBuyConfirm,
  handleBuyCancel,
} from './handlers/buy.handler.js';
import { handleRegName, handleRegEmail, handleRegOtp, handleRegPassword } from '@/bot/shared/registration.js';

export function createBuyerBot() {
  const token = process.env.BUYER_BOT_TOKEN;
  if (!token) throw new Error('BUYER_BOT_TOKEN is not defined in environment variables');

  const bot = new Bot<BuyerContext>(token);

  // setMyCommands es best-effort: si falla (token inválido, sin red) no bloquea
  void bot.api
    .setMyCommands([
      { command: 'start', description: 'Menú principal' },
      { command: 'buy', description: 'Comprar tarjetas de regalo' },
      { command: 'orders', description: 'Ver mis órdenes' },
      { command: 'help', description: 'Ayuda' },
    ])
    .catch((err) => console.warn('[BuyerBot] setMyCommands falló (no crítico):', err.message));

  // ── Middlewares globales ───────────────────────────────────────────────────
  bot.use(
    limit(),
    session<BuyerSessionData, BuyerContext>({
      initial: (): BuyerSessionData => ({
        wizard: { step: 'idle' },
        storedMessageIds: [],
      }),
      storage: new PrismaAdapter<BuyerSessionData>(prisma.botSession as any),
      getSessionKey: (ctx) => (ctx.from ? `buyer:${ctx.from.id}` : undefined),
    }),
  );

  // ── /start y wizard de registro (SIN auth — self-service) ─────────────────
  bot.command('start', startBuyer);

  // Wizard de registro: captura texto ANTES del auth middleware
  bot.on(':text', async (ctx, next) => {
    const step = ctx.session.wizard.step;
    if (step === 'awaitingName') return handleRegName(ctx, 'BUYER');
    if (step === 'awaitingEmail') return handleRegEmail(ctx, 'BUYER');
    if (step === 'awaitingOtp') return handleRegOtp(ctx, 'BUYER', () => startBuyer(ctx));
    if (step === 'awaitingPassword') return handleRegPassword(ctx, 'BUYER');
    return next();
  });

  // ── Auth requerida para todo lo demás ─────────────────────────────────────
  bot.use(authenticateBuyer);

  // ── Comandos ──────────────────────────────────────────────────────────────
  bot.command('buy', startBuyWizard);
  bot.command('orders', handleOrders);
  bot.command('help', (ctx) =>
    ctx.reply(
      '📋 <b>Comandos disponibles:</b>\n\n' +
        '/buy — Buscar y comprar tarjetas\n' +
        '/orders — Ver mis órdenes\n\n' +
        '<i>Usá los botones para navegar por los menús.</i>',
      { parse_mode: 'HTML' },
    ),
  );

  // ── Callback queries ──────────────────────────────────────────────────────

  // Menú
  bot.callbackQuery('start', startBuyer as any);

  // Buy flow
  bot.callbackQuery('buy_start', startBuyWizard);
  bot.callbackQuery(/^buy_brand_/, handleBuyBrandSelected);
  bot.callbackQuery(/^buy_country_/, handleBuyCountrySelected);
  bot.callbackQuery('buy_confirm', handleBuyConfirm);
  bot.callbackQuery('buy_cancel', handleBuyCancel);

  // Orders
  bot.callbackQuery(/^my_orders(_\d+)?$/, handleOrders);
  bot.callbackQuery(/^order_detail_/, handleOrderDetail);
  bot.callbackQuery(/^confirm_usage_/, handleConfirmUsage);
  bot.callbackQuery(/^cancel_order_/, handleCancelOrder);
  bot.callbackQuery(/^make_payment_/, handleMakePayment);

  // Report
  bot.callbackQuery(/^report_issues(_.*)?$/, handleReportIssues);
  bot.callbackQuery(/^report_card_/, handleReportCardSelect);
  bot.callbackQuery(/^report_type_/, handleReportTypeSelect);
  bot.callbackQuery('report_modify', handleReportModify);
  bot.callbackQuery('report_delete', handleReportDelete);
  bot.callbackQuery('report_proof_skip', handleReportProofSkip);

  // ── Mensajes de texto y multimedia post-auth ──────────────────────────────
  bot.on(':text', async (ctx) => {
    const step = ctx.session.wizard.step;
    if (step === 'awaitingAmount') return handleAmountText(ctx);
    if (step === 'awaitingPaymentId') return handlePaymentText(ctx);
    if (step === 'awaitingReportAmount') return handleReportAmountText(ctx);
  });

  bot.on(':photo', async (ctx) => {
    const step = ctx.session.wizard.step;
    if (step === 'awaitingReportProof') return handleReportProofPhoto(ctx);
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error('[BuyerBot] Error:', err.message, err.ctx?.update);
    err.ctx?.reply('❌ Ocurrió un error inesperado. Intentá de nuevo o usá /start.').catch(() => {});
  });

  const webhookPath = `/api/bot/buyer/${token.split(':')[0]}`;

  return { bot, webhookPath };
}
