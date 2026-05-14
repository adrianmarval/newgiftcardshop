import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { startRegistration } from '@/bot/shared/registration.js';

export async function startBuyer(ctx: BuyerContext) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  // ¿Ya tiene cuenta vinculada?
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { name: true, isActive: true, emailVerified: true, role: true },
  });

  if (user && user.role === 'SELLER') {
    return ctx.reply(
      '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot. Por favor, contactá al administrador si creés que es un error.',
      { parse_mode: 'HTML' },
    );
  }

  if (user) {
    if (!user.isActive) {
      return ctx.reply(
        `⏳ <b>Hola, ${user.name}.</b>\n\nTu cuenta está pendiente de activación por el administrador.\n\n👉 <b>Por favor, contactá a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
        { parse_mode: 'HTML' },
      );
    }

    // Reinicia wizard y muestra menú
    ctx.session.wizard = { step: 'idle' };

    const kb = new InlineKeyboard().text('📋 Mis órdenes', 'my_orders').row().text('🛒 Comprar tarjetas', 'buy_start');

    return ctx.reply(`👋 ¡Hola de nuevo, <b>${user.name}</b>!\n\nUsá los botones para navegar.`, { parse_mode: 'HTML', reply_markup: kb });
  }

  // Sin cuenta → iniciar wizard de registro
  await startRegistration(ctx, 'BUYER');
}
