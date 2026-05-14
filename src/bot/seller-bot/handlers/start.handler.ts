import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { SellerContext } from '@/bot/shared/types.js';
import { startRegistration } from '@/bot/shared/registration.js';

export async function startSeller(ctx: SellerContext) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  // ¿Ya tiene cuenta vinculada?
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { name: true, isActive: true, emailVerified: true, role: true },
  });

  if (user && user.role === 'BUYER') {
    return ctx.reply(
      '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot. Please contact the administrator if you think this is a mistake.',
      { parse_mode: 'HTML' },
    );
  }

  if (user) {
    if (!user.isActive) {
      return ctx.reply(
        `⏳ <b>Hello, ${user.name}.</b>\n\nYour account is awaiting activation by the administrator.\nWe will notify you once it is ready.`,
        { parse_mode: 'HTML' },
      );
    }

    // Reinicia wizard, limpia basura temporal y muestra menú
    ctx.session.wizard = { step: 'idle' };
    await prisma.provenanceImage.deleteMany({ where: { batchId: `temp_${ctx.from?.id}` } });

    const kb = new InlineKeyboard().text('📦 My Batches', 'my_batches').row().text('➕ Sell Giftcards', 'sell_start');

    return ctx.reply(`👋 Welcome back, <b>${user.name}</b>!\n\nUse the buttons below to navigate.`, {
      parse_mode: 'HTML',
      reply_markup: kb,
    });
  }

  // Sin cuenta → iniciar wizard de registro
  await startRegistration(ctx, 'SELLER');
}
