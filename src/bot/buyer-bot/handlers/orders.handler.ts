import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { fmt$, fmtOrderStatus, fmtGiftcardStatus, fmtDate } from '@/bot/shared/formatters.js';
import { decrypt } from '@/lib/encryption';

const PAGE_SIZE = 5;

export async function handleOrders(ctx: BuyerContext) {
  const userId = ctx.user.id;
  const page = parseInt(ctx.callbackQuery?.data?.split('_').pop() || '1') || 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { giftcards: true } } },
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (orders.length === 0 && page === 1) {
    const kb = new InlineKeyboard().text('🛒 Comprar tarjetas', 'buy_start');
    return ctx.reply('📭 No tenés órdenes todavía.', { reply_markup: kb });
  }

  let msg = `📋 <b>Tus órdenes (Página ${page} de ${totalPages}):</b>\n\n`;
  const kb = new InlineKeyboard();

  for (const order of orders) {
    const total = order.adjustedTotal ?? order.total;
    msg += `<b>${order.id.slice(0, 8)}…</b> — ${fmtOrderStatus(order.status)}\n`;
    msg += `   ${order._count.giftcards} tarjeta(s) · <b>${fmt$(total)}</b> · 🔵 ${fmtDate(order.createdAt)}\n\n`;
    kb.text(`🔍 Ver #${order.id.slice(0, 8)}…`, `order_detail_${order.id}`).row();
  }

  // Pagination buttons
  const hasNext = skip + PAGE_SIZE < totalCount;
  const hasPrev = page > 1;

  if (hasPrev || hasNext) {
    if (hasPrev) kb.text('⬅️ Más recientes', `my_orders_${page - 1}`);
    if (hasNext) kb.text('Anteriores ➡️', `my_orders_${page + 1}`);
    kb.row();
  }

  if (ctx.callbackQuery) {
    return ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
  }
  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleOrderDetail(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('order_detail_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      giftcards: {
        include: { brandCountry: { include: { brand: true, country: true } } },
      },
    },
  });

  if (!order || order.userId !== ctx.user.id) {
    return ctx.answerCallbackQuery('Orden no encontrada');
  }

  const total = order.adjustedTotal ?? order.total;

  let msg =
    `📋 <b>Orden ${order.id.slice(0, 8)}…</b>\n` +
    `Estado: ${fmtOrderStatus(order.status)}\n` +
    `Total: <b>${fmt$(total)}</b>\n` +
    `Fecha: ${fmtDate(order.createdAt)}\n\n` +
    `<b>Tarjetas:</b>\n`;

  for (const card of order.giftcards) {
    const brand = card.brandCountry.brand;
    const country = card.brandCountry.country;

    msg += `\n${brand.icon} <b>${brand.name} ${country.name}</b> — ${fmt$(card.amount)}\n`;
    msg += `Estado: ${fmtGiftcardStatus(card.status)}\n`;

    // Solo revelamos el código si la orden ya fue creada (el buyer es dueño)
    if (order.status !== 'CANCELLED') {
      try {
        const claimCode = decrypt(card.claimCode);
        msg += `Código: <code>${claimCode}</code>\n`;
        if (card.pinCode) {
          const pin = decrypt(card.pinCode);
          msg += `PIN: <code>${pin}</code>\n`;
        }
      } catch {
        msg += `Código: <i>(error al leer)</i>\n`;
      }
    }
  }

  const kb = new InlineKeyboard();

  if (order.status === 'PENDING') {
    kb.text('✅ Confirmé el uso', `confirm_usage_${order.id}`).row();
    kb.text('🚩 Reportar problema', `report_issues_${order.id}`).row();
  }
  if (order.status === 'AWAITING_PAYMENT') {
    kb.text('💳 Envié el pago', `make_payment_${order.id}`).row();
  }

  kb.text('⬅️ Volver', 'my_orders');

  await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
  return ctx.answerCallbackQuery();
}

export async function handleConfirmUsage(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('confirm_usage_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { giftcards: true },
  });

  if (!order || order.userId !== ctx.user.id) return ctx.answerCallbackQuery('Orden no encontrada');
  if (order.status !== 'PENDING') return ctx.answerCallbackQuery('Estado inválido');

  // Calcular adjustedTotal
  const { Prisma } = await import('@/generated/prisma/client');
  const adjustedTotal = order.giftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum.plus(card.amount.mul(order.buyRate));
    if (card.status === 'WRONG_AMOUNT' && card.reportedAmount) return sum.plus(card.reportedAmount.mul(order.buyRate));
    return sum;
  }, new Prisma.Decimal(0));

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'AWAITING_PAYMENT', adjustedTotal },
    });
    for (const card of order.giftcards) {
      await tx.giftcard.update({
        where: { id: card.id },
        data: {
          status: card.status === 'UNUSED' ? 'USED' : card.status,
          isConfirmed: true,
        },
      });
    }
  });

  const kb = new InlineKeyboard().text('💳 Enviar pago ahora', `make_payment_${orderId}`).row().text('⬅️ Ver mis órdenes', 'my_orders');

  await ctx.editMessageText(
    `✅ <b>Uso confirmado.</b>\n\nTotal a pagar: <b>${fmt$(adjustedTotal)}</b>\n\n` +
      `Enviá el pago en USDT a la dirección del administrador y confirmá con el botón.`,
    { parse_mode: 'HTML', reply_markup: kb },
  );
  return ctx.answerCallbackQuery('Uso confirmado');
}

export async function handleMakePayment(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('make_payment_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  ctx.session.wizard.step = 'awaitingPaymentId';
  ctx.session.wizard.orderId = orderId;

  await ctx.editMessageText('💳 <b>Enviá el ID de transacción de Binance:</b>\n\n' + '<i>Ejemplo: 5A3F2E1D4C6B...</i>', {
    parse_mode: 'HTML',
  });
  return ctx.answerCallbackQuery();
}

export async function handlePaymentText(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingPaymentId') return;

  const txId = (ctx.message as any)?.text?.trim() as string | undefined;
  if (!txId) return;

  const orderId = ctx.session.wizard.orderId;
  if (!orderId) return ctx.reply('❌ Sesión expirada. Usá /orders para ver tu orden.');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== ctx.user.id || order.status !== 'AWAITING_PAYMENT') {
    return ctx.reply('❌ Orden no encontrada o en estado inválido.');
  }

  const { Prisma } = await import('@/generated/prisma/client');
  const paymentAmount = order.adjustedTotal ?? order.total;

  const platformSettings = await prisma.platformSettings.findFirst({
    where: { key: 'balance' },
  });

  const currentBalance = platformSettings ? new Prisma.Decimal(platformSettings.balance) : new Prisma.Decimal(0);

  const balanceAfter = currentBalance.add(new Prisma.Decimal(paymentAmount));

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        amount: paymentAmount,
        balanceAfter,
        direction: 'CREDIT',
        category: 'ORDER',
        orderId: order.id,
        binanceTxId: txId,
        relatedUserId: order.userId,
      },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
    if (platformSettings) {
      await tx.platformSettings.update({
        where: { id: platformSettings.id },
        data: { balance: balanceAfter },
      });
    }
  });

  ctx.session.wizard.step = 'idle';
  ctx.session.wizard.orderId = undefined;

  const kb = new InlineKeyboard().text('📋 Ver mis órdenes', 'my_orders');

  return ctx.reply(`✅ <b>¡Pago registrado!</b>\n\nOrden completada por <b>${fmt$(paymentAmount)}</b>.\n\n<i>TxID: ${txId}</i>`, {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}
