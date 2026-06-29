import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { startRegistration } from '@/bot/shared/registration.js';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';

export async function startBuyer(ctx: BuyerContext) {
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

  try {
    // ¿Ya tiene cuenta vinculada?
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: { select: { name: true, isActive: true, emailVerified: true, role: true } } },
    });

    const user = telegramUser?.user;

    if (user && user.role === 'SELLER') {
      await renderUI(
        ctx,
        '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot. Por favor, contactá al administrador si creés que es un error.',
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
          `⏳ <b>Hola, ${escapedName}.</b>\n\nTu cuenta está pendiente de activación por el administrador.\n\n👉 <b>Por favor, contactá a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
          { parse_mode: 'HTML' },
        );
        await cleanupOldMessage();
        return deleteUserInput(ctx);
      }

      // Reinicia wizard y muestra menú
      if (!ctx.session.wizard) ctx.session.wizard = { step: 'idle' };
      ctx.session.wizard.step = 'idle';

      const kb = new InlineKeyboard().text('📋 Ver Mis órdenes', 'my_orders').row().text('🛒 Comprar tarjetas', 'buy_start');
      const escapedName = escapeHTML(user.name);

      await renderUI(ctx, `👋 ¡Hola de nuevo, <b>${escapedName}</b>!\n\nUsá los botones para navegar.`, {
        parse_mode: 'HTML',
        reply_markup: kb,
      });
      await cleanupOldMessage();
      return deleteUserInput(ctx);
    }

    // Sin cuenta → iniciar wizard de registro
    await startRegistration(ctx, 'BUYER');
    await cleanupOldMessage();
    await deleteUserInput(ctx);
  } catch (_err: any) {
    await ctx.reply('❌ Ocurrió un error al iniciar el bot. Por favor, intentá de nuevo más tarde.').catch(() => {});
  }
}
