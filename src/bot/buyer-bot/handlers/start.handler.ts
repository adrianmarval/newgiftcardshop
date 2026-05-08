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
    select: { name: true, isActive: true, emailVerified: true },
  });

  if (user) {
    if (!user.isActive) {
      return ctx.reply(
        `⏳ <b>Hola, ${user.name}.</b>\n\nTu cuenta está pendiente de activación por el administrador.\nTe avisaremos cuando esté lista.`,
        { parse_mode: 'HTML' },
      );
    }

    // Reinicia wizard y muestra menú
    ctx.session.wizard = { step: 'idle' };

    const kb = new InlineKeyboard()
      .text('🛒 Comprar tarjetas', 'buy_start')
      .row()
      .text('📋 Mis órdenes', 'my_orders');

    return ctx.reply(
      `👋 ¡Hola de nuevo, <b>${user.name}</b>!\n\nUsá los botones para navegar.`,
      { parse_mode: 'HTML', reply_markup: kb },
    );
  }

  // Sin cuenta → iniciar wizard de registro
  await startRegistration(ctx, 'BUYER');
}
