import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { startRegistration } from '@/bot/shared/registration.js';
import { hasLegacyEmail } from '@/bot/shared/web-claim.js';
import { renderUI, deleteUserInput, escapeHTML, resolveFlowThreadId } from '@/bot/shared/ui.js';

export async function startBuyer(ctx: BuyerContext) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  // Extract deep link param from /start <param>
  const text = ctx.message?.text ?? '';
  const startParam = text.startsWith('/start ') ? text.slice(7).trim() : undefined;

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
      include: { user: { select: { name: true, isActive: true, emailVerified: true, role: true, email: true } } },
    });

    const user = telegramUser?.user;

    if (user && user.role === 'SELLER') {
      await renderUI(
        ctx,
        '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot. Por favor, contacta al administrador si crees que es un error.',
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
          `⏳ <b>Hola, ${escapedName}.</b>\n\nTu cuenta está pendiente de activación por el administrador.\n\n👉 <b>Por favor, contacta a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
          { parse_mode: 'HTML' },
        );
        await cleanupOldMessage();
        return deleteUserInput(ctx);
      }

      // Reinicia wizard y muestra menú
      if (!ctx.session.wizard) ctx.session.wizard = { step: 'idle' };
      ctx.session.wizard.step = 'idle';

      const kb = new InlineKeyboard()
        .text('📋 Ver Mis órdenes', 'my_orders')
        .row()
        .text('🛒 Comprar tarjetas', 'buy_start')
        .row()
        .text('🔐 Seguridad (PIN)', 'sec_menu');

      // Usuario migrado (email legacy) → ofrecer activación de acceso web.
      // Ya activado → acceso directo al panel web.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (hasLegacyEmail(user.email)) {
        kb.row().text('(Nuevo🔥) Activar acceso web 🌐', 'claim_web_start');
      } else if (appUrl) {
        kb.row().url('(Nuevo🔥) Abrir app web 🌐', `${appUrl}/store/dashboard`);
      }
      const escapedName = escapeHTML(user.name);

      await renderUI(ctx, `👋 ¡Hola de nuevo, <b>${escapedName}</b>!\n\nUsa los botones para navegar.`, {
        parse_mode: 'HTML',
        reply_markup: kb,
      });
      await cleanupOldMessage();
      return deleteUserInput(ctx);
    }

    // Sin cuenta → iniciar wizard de registro (con deep link si existe)
    await startRegistration(ctx, 'BUYER', startParam);
    await cleanupOldMessage();
    await deleteUserInput(ctx);
  } catch (_err: any) {
    const threadId = await resolveFlowThreadId(ctx).catch(() => undefined);
    const errorMsg = '❌ Ocurrió un error al iniciar el bot. Por favor, intenta de nuevo más tarde.';
    // Si el thread está stale (topic borrado/cerrado), reintentar como mensaje plano
    await ctx
      .reply(errorMsg, {
        ...(threadId != null ? { message_thread_id: threadId } : {}),
      })
      .catch(() => ctx.reply(errorMsg).catch(() => {}));
  }
}
