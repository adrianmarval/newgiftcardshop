import { Bot, InlineKeyboard, session } from 'grammy';
import { PrismaAdapter } from '@grammyjs/storage-prisma';
import { limit } from '@grammyjs/ratelimiter';
import type { BuyerContext, BuyerSessionData } from '@/bot/shared/types.js';
import prisma from '@/lib/prisma';
import { authenticateBuyer, sequentialize } from '@/bot/shared/middleware.js';
import { renderUI, deleteUserInput } from '@/bot/shared/ui.js';
import { startBuyer } from './handlers/start-handler.js';
import {
  handleOrders,
  handleOrderDetail,
  handleConfirmUsage,
  handleConfirmUsageFinal,
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
} from './handlers/orders-handler.js';
import {
  startBuyWizard,
  handleBuyBrandSelected,
  handleBuyCountrySelected,
  handleAmountText,
  handleBuyConfirm,
  handleBuyCancel,
} from './handlers/buy-handler.js';
import {
  handleSecUnlock,
  handleSecCancel,
  handleSecPinForgot,
  handleSecMenu,
  handleSecCreatePin,
  handleSecChangePin,
  handleSecurityPinText,
  handlePinSetupText,
  handlePinSetupConfirmText,
  handlePinResetOtpText,
  handlePinResetNewPinText,
  handlePinResetConfirmText,
  handlePinChangeCurrentText,
  handlePinChangeNewText,
  handlePinChangeConfirmText,
} from './handlers/security-handler.js';
import { handleRegName, handleRegEmail, handleRegOtp, handleRegPassword, handleLinkConfirmation } from '@/bot/shared/registration.js';
import { startWebClaim, handleClaimEmail, handleClaimOtp, handleClaimPassword } from '@/bot/shared/web-claim.js';

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

  const botId = Number(token.split(':')[0]);

  // ── Middlewares globales ───────────────────────────────────────────────────
  bot.use(
    // Ignora updates cuya autoría es el propio bot (service messages como
    // forum_topic_created al crear topics — Telegram los entrega al bot).
    // Guard ANTES de session para no persistir filas basura en bot_session.
    (ctx: BuyerContext, next) => (ctx.from?.id === botId ? undefined : next()),
    // Set botRole for topic name resolution in shared UI
    (ctx: BuyerContext, next) => {
      ctx.botRole = 'BUYER';
      return next();
    },
    limit({
      timeFrame: 3000,
      limit: 30,
      onLimitExceeded: (ctx) => {
        if (ctx.callbackQuery) {
          ctx.answerCallbackQuery('Calma, vas muy rápido').catch(() => {});
        }
      },
    }),
    sequentialize((ctx) => (ctx.from ? `buyer:${ctx.from.id}` : undefined)),
    session<BuyerSessionData, BuyerContext>({
      initial: (): BuyerSessionData => ({
        wizard: { step: 'idle' },
        uiMessageId: undefined,
        lastChatId: undefined,
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
    if (step === 'awaitingLinkConfirmation') return; // Ignorar texto durante confirmación (usa callbacks)
    return next();
  });

  // ── Auth requerida para todo lo demás ─────────────────────────────────────
  bot.use(authenticateBuyer);

  // ── Comandos ──────────────────────────────────────────────────────────────
  bot.command('buy', startBuyWizard);
  bot.command('orders', handleOrders);
  bot.command('help', async (ctx) => {
    await deleteUserInput(ctx);
    await renderUI(
      ctx,
      '📋 <b>Comandos disponibles:</b>\n\n' +
        '/buy — Buscar y comprar tarjetas\n' +
        '/orders — Ver mis órdenes\n\n' +
        '<i>Usá los botones para navegar por los menús.</i>',
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('🏠 Volver al Menú', 'start') },
    );
  });

  // ── Callback queries ──────────────────────────────────────────────────────

  // Confirmación de vinculación (deep link)
  bot.callbackQuery('link_confirm', (ctx) => handleLinkConfirmation(ctx, 'BUYER', true, () => startBuyer(ctx)));
  bot.callbackQuery('link_cancel', (ctx) => handleLinkConfirmation(ctx, 'BUYER', false));

  // Menú
  bot.callbackQuery('start', startBuyer);

  // Web claim (usuario migrado con email legacy activa acceso web)
  bot.callbackQuery('claim_web_start', (ctx) => startWebClaim(ctx, 'BUYER'));

  // Buy flow
  bot.callbackQuery('buy_start', startBuyWizard);
  bot.callbackQuery(/^buy_brand_/, handleBuyBrandSelected);
  bot.callbackQuery(/^buy_country_/, handleBuyCountrySelected);
  bot.callbackQuery('buy_confirm', handleBuyConfirm);
  bot.callbackQuery('buy_cancel', handleBuyCancel);

  // Orders
  bot.callbackQuery(/^my_orders(_\d+)?$/, handleOrders);
  bot.callbackQuery(/^order_detail_/, handleOrderDetail);
  bot.callbackQuery(/^confirm_usage_final_/, handleConfirmUsageFinal);
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

  // Security PIN (gate de revelación de códigos)
  bot.callbackQuery(/^sec_unlock_/, handleSecUnlock);
  bot.callbackQuery('sec_cancel', handleSecCancel);
  bot.callbackQuery('sec_pin_forgot', handleSecPinForgot);
  bot.callbackQuery('sec_menu', handleSecMenu);
  bot.callbackQuery('sec_create_pin', handleSecCreatePin);
  bot.callbackQuery('sec_change_pin', handleSecChangePin);

  // ── Mensajes de texto y multimedia post-auth ──────────────────────────────
  bot.on(':text', async (ctx) => {
    const step = ctx.session.wizard.step;
    if (step === 'awaitingAmount') return handleAmountText(ctx);
    if (step === 'awaitingPaymentId') return handlePaymentText(ctx);
    if (step === 'awaitingReportAmount') return handleReportAmountText(ctx);
    // Security PIN wizard
    if (step === 'awaitingSecurityPin') return handleSecurityPinText(ctx);
    if (step === 'awaitingPinSetup') return handlePinSetupText(ctx);
    if (step === 'awaitingPinSetupConfirm') return handlePinSetupConfirmText(ctx);
    if (step === 'awaitingPinResetOtp') return handlePinResetOtpText(ctx);
    if (step === 'awaitingPinResetNewPin') return handlePinResetNewPinText(ctx);
    if (step === 'awaitingPinResetConfirm') return handlePinResetConfirmText(ctx);
    if (step === 'awaitingPinChangeCurrent') return handlePinChangeCurrentText(ctx);
    if (step === 'awaitingPinChangeNew') return handlePinChangeNewText(ctx);
    if (step === 'awaitingPinChangeConfirm') return handlePinChangeConfirmText(ctx);
    // Web claim wizard
    if (step === 'awaitingClaimEmail') return handleClaimEmail(ctx, 'BUYER');
    if (step === 'awaitingClaimOtp') return handleClaimOtp(ctx, 'BUYER');
    if (step === 'awaitingClaimPassword') return handleClaimPassword(ctx, 'BUYER', () => startBuyer(ctx));
    await deleteUserInput(ctx);
  });

  bot.on(':photo', async (ctx) => {
    const step = ctx.session.wizard.step;
    if (step === 'awaitingReportProof') return handleReportProofPhoto(ctx);
    await deleteUserInput(ctx);
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error('[BuyerBot] Error:', err.message, err.ctx?.update);
    err.ctx?.reply('❌ Ocurrió un error inesperado. Intenta de nuevo o usa /start.').catch(() => {});
  });

  const webhookPath = `/api/bot/buyer/${token.split(':')[0]}`;

  return { bot, webhookPath };
}
