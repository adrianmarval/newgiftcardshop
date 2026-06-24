import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { SellerContext } from '@/bot/shared/types.js';
import { startRegistration } from '@/bot/shared/registration.js';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';

export async function startSeller(ctx: SellerContext) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  // Limpiar uiMessageId cuando /start se ejecuta como comando directo
  // (no como callback query) — el usuario pudo haber borrado los mensajes del chat
  const chatId = ctx.chat?.id || ctx.from?.id;
  const oldMessageId = !ctx.callbackQuery ? ctx.session.uiMessageId : undefined;

  if (!ctx.callbackQuery) {
    ctx.session.uiMessageId = undefined;
    ctx.session.lastChatId = undefined;
    ctx.session.storedMessageIds = [];
    ctx.session.wizard = { step: 'idle' };
  }

  // Helper para borrar el mensaje viejo después de renderUI
  const cleanupOldMessage = async () => {
    if (oldMessageId && chatId) {
      await ctx.api.deleteMessage(chatId, oldMessageId).catch(() => {});
    }
  };

  // ¿Ya tiene cuenta vinculada?
  const telegramUser = await prisma.telegramUser.findUnique({
    where: { telegramId },
    include: { user: { select: { name: true, isActive: true, emailVerified: true, role: true } } },
  });

  const user = telegramUser?.user;

  if (user && user.role === 'BUYER') {
    await renderUI(
      ctx,
      '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot. Please contact the administrator if you think this is a mistake.',
      { parse_mode: 'HTML' },
    );
    await cleanupOldMessage();
    return deleteUserInput(ctx);
  }

  if (user) {
    if (!user.isActive) {
      const escapedName = escapeHTML(user.name);
      await renderUI(
        ctx,
        `⏳ <b>Hello, ${escapedName}.</b>\n\nYour account is awaiting activation by the administrator.\n\n👉 <b>Please contact @${process.env.ADMIN_TELEGRAM_USERNAME} to activate it.</b>`,
        { parse_mode: 'HTML' },
      );
      await cleanupOldMessage();
      return deleteUserInput(ctx);
    }

    // Reinicia wizard, limpia basura temporal y muestra menú
    if (!ctx.session.wizard) ctx.session.wizard = { step: 'idle' };
    ctx.session.wizard.step = 'idle';
    await prisma.provenanceImage.deleteMany({ where: { batchId: `temp_${ctx.from?.id}` } });

    const kb = new InlineKeyboard().text('📦 View My Batches', 'my_batches').row().text('➕ Sell Giftcards', 'sell_start');
    const escapedName = escapeHTML(user.name);

    await renderUI(ctx, `👋 Welcome back, <b>${escapedName}</b>!\n\nUse the buttons below to navigate.`, {
      parse_mode: 'HTML',
      reply_markup: kb,
    });
    await cleanupOldMessage();
    return deleteUserInput(ctx);
  }

  // Sin cuenta → iniciar wizard de registro
  await startRegistration(ctx, 'SELLER');
  await cleanupOldMessage();
  await deleteUserInput(ctx);
}
