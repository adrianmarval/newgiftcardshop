import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { fmt$, fmtGiftcardStatus, fmtDate } from '@/bot/shared/formatters.js';
import { decrypt } from '@/lib/encryption';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';
import {
  findOrderForUser,
  canCancelOrder,
  cancelOrder,
  confirmOrderUsage,
  completeOrderPayment,
  reportGiftcardIssue,
  deleteGiftcardIssue,
  OrderAlreadyProcessedError,
  InvalidOrderStateError,
  PaymentVerificationError,
} from '@/lib/services/order';
import { orderNeedsSecurityGate, isSecurityUnlocked } from '@/lib/services/security';

import { Prisma } from '@/generated/prisma/client';
import { strike } from '@/bot/shared/formatters';
import { createLogger } from '@/lib/logger';

const buyerLogger = createLogger('buyer-bot');

const PAGE_SIZE = 5;

export async function handleOrders(ctx: BuyerContext) {
  await deleteUserInput(ctx);
  const userId = ctx.user.id;
  const cbData = ctx.callbackQuery?.data || '';
  const pageMatch = cbData.match(/^my_orders_(\d+)$/);
  const page = pageMatch ? parseInt(pageMatch[1]) : 1;
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
    const kb = new InlineKeyboard().text('🛒 Comprar tarjetas', 'buy_start').row().text('🏠 Volver al Menú', 'start');
    await renderUI(ctx, '📭 No tenés órdenes todavía.', { reply_markup: kb });
    return;
  }

  const kb = new InlineKeyboard();
  let msg = `📋 <b>Tus Órdenes</b> (Página ${page}/${totalPages})\n\n`;
  msg += '<b>Leyenda:</b>\n';
  msg += '🟢 Completada\n🔵 Esperando Pago\n🟡 Pendiente\n🔴 Cancelada\n\n';
  msg += '👇 Selecciona una orden para ver sus detalles:';

  for (const order of orders) {
    let icon = '🟡';
    if (order.status === 'COMPLETED') icon = '🟢';
    else if (order.status === 'AWAITING_PAYMENT') icon = '🔵';
    else if (order.status === 'CANCELLED') icon = '🔴';

    const shortId = order.id.slice(-8).toUpperCase();
    const dateStr = fmtDate(order.createdAt);
    const label = `${icon} Orden #${shortId} · ${dateStr}`;
    kb.text(label, `order_detail_${order.id}_${page}`).row();
  }

  const hasNext = skip + PAGE_SIZE < totalCount;
  const hasPrev = page > 1;

  if (hasPrev || hasNext) {
    kb.row();
    if (hasPrev) kb.text('⬅️ Más recientes', `my_orders_${page - 1}`);
    if (hasNext) kb.text('Anteriores ➡️', `my_orders_${page + 1}`);
    kb.row();
  }

  kb.text('🏠 Volver al Menú', 'start');
  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleOrderDetail(ctx: BuyerContext) {
  const data = ctx.callbackQuery?.data?.split('_') || [];
  const orderId = data[2];
  const fromPage = parseInt(data[3] || '1');

  if (!orderId) return ctx.answerCallbackQuery();

  await renderOrderDetail(ctx, orderId, fromPage);
}

/**
 * Render del detalle de orden (códigos + resumen + acciones).
 * Exportado para re-renderizar tras el desbloqueo por PIN (security-handler).
 * Aplica el security gate: si la orden tiene cards sin confirmar y el buyer no
 * tiene unlock vigente, los códigos se muestran enmascarados + botón Desbloquear.
 */
export async function renderOrderDetail(ctx: BuyerContext, orderId: string, fromPage = 1) {
  // Si había un paso de pago activo de OTRA orden, cancelarlo antes de pisar
  // wizard.orderId — sin esto, el próximo texto del usuario se procesaba como
  // TxID de una orden distinta a la que inició el pago.
  if (ctx.session.wizard.step === 'awaitingPaymentId' && ctx.session.wizard.orderId !== orderId) {
    ctx.session.wizard.step = 'idle';
  }
  ctx.session.wizard.orderId = orderId;

  let order;
  try {
    order = await findOrderForUser(orderId, ctx.user.id);
  } catch {
    if (ctx.callbackQuery) return ctx.answerCallbackQuery('Orden no encontrada');
    return renderUI(ctx, '❌ Orden no encontrada.', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
    });
  }

  const orderWithBrand = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      giftcards: {
        orderBy: { id: 'asc' },
        include: { brandCountry: { include: { brand: true, country: true } } },
      },
    },
  });

  if (!orderWithBrand) {
    if (ctx.callbackQuery) return ctx.answerCallbackQuery('Orden no encontrada');
    return renderUI(ctx, '❌ Orden no encontrada.', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
    });
  }

  // Security gate: enmascarar códigos si la orden tiene cards sin confirmar y
  // el buyer no tiene un unlock vigente (PIN). Nunca desencriptar en ese caso.
  const codesLocked = orderNeedsSecurityGate(order.giftcards) && !(await isSecurityUnlocked(ctx.user.id));
  const renderCode = (encrypted: string) => (codesLocked ? '🔒 ••••••••••' : escapeHTML(decrypt(encrypted)));

  const nullifiedCards = order.giftcards.filter((c) => c.status !== 'UNUSED' && c.status !== 'USED' && c.status !== 'WRONG_AMOUNT');
  const availableCards = order.giftcards.filter((c) => c.status === 'UNUSED' || c.status === 'USED' || c.status === 'WRONG_AMOUNT');

  const totalGiftcardAmount = order.giftcards.reduce((sum, c) => {
    if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status)) return sum;
    const amt = c.reportedAmount ?? c.amount;
    return sum.plus(amt);
  }, new Prisma.Decimal(0));

  const totalToPay = order.status === 'PENDING' ? totalGiftcardAmount.mul(order.buyRate) : (order.adjustedTotal ?? order.total);

  const currency = orderWithBrand.giftcards[0]?.brandCountry?.country?.currency || 'USD';
  const discountPercent = (1 - order.buyRate.toNumber()) * 100;
  const discountAmount = totalGiftcardAmount.mul(new Prisma.Decimal(1).minus(order.buyRate));

  const invalidBlock =
    nullifiedCards.length > 0
      ? `<b>❌ Tarjetas inválidas / reportadas</b>\n` +
        nullifiedCards
          .map((c) => {
            const claimCode = renderCode(c.claimCode);
            return `• <code>${claimCode}</code> - ${strike(fmt$(c.amount, currency))} - ${c.status}`;
          })
          .join('\n') +
        '\n\n'
      : '';

  const validBlock =
    availableCards.length > 0
      ? `<b>✅ Tarjetas verificadas</b>\n` +
        availableCards
          .map((c) => {
            const claimCode = renderCode(c.claimCode);
            const isWrong = c.status === 'WRONG_AMOUNT';
            const amt = c.reportedAmount ?? c.amount;
            if (isWrong) return `• <code>${claimCode}</code> - ${strike(fmt$(c.amount, currency))} → ${fmt$(amt, currency)}`;
            return `• <code>${claimCode}</code> - ${fmt$(amt, currency)}`;
          })
          .join('\n') +
        '\n\n'
      : '';

  const summary = `<b>💰 Resumen financiero</b>
• Valor tarjetas: ${fmt$(totalGiftcardAmount, currency)}
• Descuento (${discountPercent.toFixed(0)}%): -${fmt$(discountAmount, currency)}
• <b>Total ${order.status === 'COMPLETED' ? 'pagado' : 'a pagar'}: ${fmt$(totalToPay, 'USD')}</b>`;

  let instructions = '';
  if (order.status === 'PENDING') {
    if (totalToPay.isZero()) {
      instructions = `\n\n<b> Total Cero</b>\nEl total de tu orden es $0.00. No se requiere pago. Podés <b>cancelar la orden</b> si ya no la necesitás.`;
    } else if (order.giftcards.every((c) => c.isConfirmed)) {
      instructions = `\n\n<b>🎉 ¡Listo para pagar!</b>\nTodas las tarjetas han sido confirmadas. Presioná <b>"✅ Pagar ahora"</b> para proceder.`;
    } else {
      instructions = `\n\n<b>📝 Instrucciones</b>
1. Aplicá los códigos en tu cuenta.
2. Si alguno falla, usá el botón <b>"🚩 Reportar problema"</b>.
3. Al terminar, presioná <b>"✅ Confirmar uso exitoso"</b> para continuar.`;
    }
  } else if (order.status === 'AWAITING_PAYMENT') {
    instructions = `\n\n<b>💳 Pago Pendiente</b>\nPresioná el botón de abajo para informar el ID de transacción de tu pago.`;
  }

  const msg = `<b>Orden #<code>${order.id}</code></b>\n\n${invalidBlock}${validBlock}${summary}${instructions}`;

  const kb = new InlineKeyboard();

  if (codesLocked) {
    kb.text('🔓 Desbloquear y ver códigos', `sec_unlock_${order.id}`).row();
  }

  if (order.status === 'PENDING') {
    if (totalToPay.isZero()) {
      kb.text('❌ Cancelar orden', `cancel_order_${order.id}`).row();
    } else if (order.giftcards.every((c) => c.isConfirmed)) {
      kb.text('✅ Pagar ahora', `confirm_usage_${order.id}`).row();
    } else {
      kb.text('✅ Confirmar uso exitoso', `confirm_usage_${order.id}`).row();
    }
    kb.text('🚩 Reportar Problemas con Tarjetas', `report_issues_${order.id}`).row();
  }

  if (order.status === 'AWAITING_PAYMENT') {
    kb.text('💳 Informar pago', `make_payment_${order.id}`).row();
  }

  kb.url('📞 Contactar a Soporte', `https://t.me/${process.env.ADMIN_TELEGRAM_USERNAME}`).row();
  kb.text('🔙 Regresar al historial', `my_orders_${fromPage}`);

  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleCancelOrder(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('cancel_order_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  let order;
  try {
    order = await findOrderForUser(orderId, ctx.user.id);
  } catch {
    return ctx.answerCallbackQuery('Orden no encontrada');
  }

  if (order.status !== 'PENDING') return ctx.answerCallbackQuery('Solo se pueden cancelar órdenes pendientes');

  if (!canCancelOrder(order.giftcards)) {
    await ctx.answerCallbackQuery('Error: No se puede cancelar porque contiene tarjetas con saldo activo.');
    return;
  }

  try {
    await cancelOrder(orderId);
  } catch (err: any) {
    if (err?.code === 'P2025') return ctx.answerCallbackQuery('La orden ya no está pendiente');
    throw err;
  }

  buyerLogger.action('buy', 'bot-cancel-order', `Orden ${orderId} cancelada via bot`, {
    userId: ctx.user.id,
    metadata: { orderId },
  });

  await renderUI(ctx, '❌ <b>Orden cancelada.</b>\n\nLas tarjetas reportadas han sido guardadas y la orden cerrada.', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
    callbackText: 'Orden cancelada',
  });
}

export async function handleConfirmUsage(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('confirm_usage_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  let order;
  try {
    order = await findOrderForUser(orderId, ctx.user.id);
  } catch {
    return ctx.answerCallbackQuery('Orden no encontrada');
  }

  if (order.status !== 'PENDING') return ctx.answerCallbackQuery('Estado inválido');

  const totalEffectiveFaceValue = order.giftcards.reduce((sum, c) => {
    if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status)) return sum;
    return sum.plus(c.reportedAmount ?? c.amount);
  }, new Prisma.Decimal(0));

  const reportedCount = order.giftcards.filter((c) => c.status !== 'UNUSED' && c.status !== 'USED').length;
  const warningText =
    reportedCount > 0 ? `\n <b>Tenés ${reportedCount} tarjeta(s) reportada(s)</b> - El pago se ajustará automáticamente.\n` : '';

  const firstCard = order.giftcards[0];
  const brandCountry = await prisma.brandCountry.findUnique({
    where: { id: firstCard.brandCountryId },
    include: { country: true },
  });
  const currency = brandCountry?.country?.currency || 'USD';

  const kb = new InlineKeyboard()
    .text('✅ Confirmar y Procesar Pago', `confirm_usage_final_${orderId}`)
    .row()
    .text('⬅️ Regresar', `order_detail_${orderId}`);

  await renderUI(
    ctx,
    ` <b>¿Confirmar uso de tarjetas?</b>\n\n` +
      `Esta acción <b>NO se puede revertir</b>.\n\n` +
      `Al confirmar, el sistema procesará el pago al proveedor por <b>${fmt$(totalEffectiveFaceValue, currency)}</b> giftcards.\n${warningText}\n` +
      `📝 <b>Asegurate de que:</b>\n` +
      `• Las tarjetas fueron aplicadas correctamente\n` +
      `• El saldo ${fmt$(totalEffectiveFaceValue, currency)} exacto fue acreditado en tu cuenta\n` +
      `• Si hubo problemas que no reportaste, detente ahora y regresa para reportarlos con el botón "🚩 Reportar problema"`,
    { parse_mode: 'HTML', reply_markup: kb },
  );
}

export async function handleConfirmUsageFinal(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('confirm_usage_final_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  let order;
  try {
    order = await findOrderForUser(orderId, ctx.user.id);
  } catch {
    return ctx.answerCallbackQuery('Orden no encontrada');
  }

  if (order.status !== 'PENDING') return ctx.answerCallbackQuery('Estado inválido');

  try {
    const { adjustedTotal } = await confirmOrderUsage(orderId, order.buyRate);

    buyerLogger.action('buy', 'bot-confirm-usage', `Uso confirmado para orden ${orderId}`, {
      userId: ctx.user.id,
      metadata: { orderId, adjustedTotal: adjustedTotal.toString() },
    });

    const kb = new InlineKeyboard().text('💳 Enviar pago ahora', `make_payment_${orderId}`).row().text('⬅️ Ver mis órdenes', 'my_orders');

    await renderUI(
      ctx,
      `✅ <b>Uso confirmado.</b>\n\nTotal a pagar: <b>${fmt$(adjustedTotal, 'USD')}</b>\n\n` +
        `Enviá el pago en USDT a la dirección del administrador y confirmá con el botón.`,
      { parse_mode: 'HTML', reply_markup: kb, callbackText: 'Uso confirmado' },
    );
  } catch (err: any) {
    if (err?.code === 'P2025') {
      await ctx.answerCallbackQuery('La orden ya fue procesada');
      return;
    }
    throw err;
  }
}

export async function handleMakePayment(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('make_payment_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  ctx.session.wizard.step = 'awaitingPaymentId';
  ctx.session.wizard.orderId = orderId;

  await renderUI(ctx, '💳 <b>Enviá el ID de transacción de Binance:</b>\n\n' + '<i>Ejemplo: 5A3F2E1D4C6B...</i>', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('⬅️ Volver', `order_detail_${orderId}`),
  });
}

export async function handlePaymentText(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingPaymentId') return;

  const txId = (ctx.message as any)?.text?.trim() as string | undefined;
  if (!txId) return;

  await deleteUserInput(ctx);

  const orderId = ctx.session.wizard.orderId;
  if (!orderId)
    return renderUI(ctx, '❌ Sesión expirada. Usá /orders para ver tu orden.', {
      reply_markup: new InlineKeyboard().text('🏠 Inicio', 'start'),
    });

  try {
    await findOrderForUser(orderId, ctx.user.id);
  } catch {
    return renderUI(ctx, '❌ Orden no encontrada o en estado inválido.', {
      reply_markup: new InlineKeyboard().text('🏠 Inicio', 'start'),
    });
  }

  try {
    const { paymentAmount } = await completeOrderPayment(orderId, txId);

    buyerLogger.action('buy', 'bot-complete-payment', `Pago completado para orden ${orderId}`, {
      userId: ctx.user.id,
      metadata: { orderId, paymentAmount: paymentAmount.toString(), txId },
    });

    ctx.session.wizard.step = 'idle';
    ctx.session.wizard.orderId = undefined;

    const kb = new InlineKeyboard().text('📋 Ver mis órdenes', 'my_orders');
    return renderUI(
      ctx,
      `✅ <b>¡Pago registrado!</b>\n\nOrden completada por <b>${fmt$(paymentAmount, 'USD')}</b>.\n\n<i>TxID: ${escapeHTML(txId)}</i>`,
      { parse_mode: 'HTML', reply_markup: kb },
    );
  } catch (err) {
    if (err instanceof OrderAlreadyProcessedError) {
      return renderUI(ctx, ' Esta orden ya fue procesada.', {
        reply_markup: new InlineKeyboard().text('📋 Ver mis órdenes', 'my_orders'),
      });
    }
    // Race cross-canal: la orden se completó/canceló desde la web (u otra sesión)
    // mientras el wizard esperaba el TxID. Sin este catch el error caía al
    // middleware de grammy sin feedback al usuario.
    if (err instanceof InvalidOrderStateError) {
      ctx.session.wizard.step = 'idle';
      ctx.session.wizard.orderId = undefined;
      return renderUI(ctx, '⚠️ <b>Esta orden ya no está esperando pago.</b>\n\nEs posible que la hayas completado o cancelado desde otra sesión.', {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('📋 Ver mis órdenes', 'my_orders'),
      });
    }
    if (err instanceof PaymentVerificationError) {
      return renderUI(
        ctx,
        `❌ <b>No se pudo verificar tu pago.</b>\n\n${escapeHTML(err.message)}\n\n<b>Revisá el ID de transacción y enviálo nuevamente:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('🔄 Reintentar', `make_payment_${orderId}`).text('📋 Ver mis órdenes', 'my_orders').row(),
        },
      );
    }
    throw err;
  }
}

// ── Problem Reporting ────────────────────────────────────────────────────────

export async function handleReportIssues(ctx: BuyerContext) {
  const data = ctx.callbackQuery?.data;
  const orderId =
    (data?.includes('report_issues') ? data.replace('report_issues_', '').replace('report_issues', '') : null) ||
    ctx.session.wizard.orderId;
  if (!orderId) return ctx.answerCallbackQuery?.('Error en la sesión');

  let order;
  try {
    order = await findOrderForUser(orderId, ctx.user.id);
  } catch {
    return ctx.answerCallbackQuery?.('Orden no encontrada');
  }

  const orderWithBrand = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      giftcards: {
        orderBy: { id: 'asc' },
        include: { brandCountry: { include: { brand: true, country: true } } },
      },
    },
  });

  if (!orderWithBrand) return ctx.answerCallbackQuery?.('Orden no encontrada');

  if (order.status !== 'PENDING') {
    return renderUI(ctx, '⚠️ No se pueden reportar problemas en una orden que ya fue confirmada.', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
    });
  }

  const kb = new InlineKeyboard();
  let msg = '🚩 <b>¿Con qué tarjeta tenés problemas?</b>\n\nSeleccioná una tarjeta para reportar o gestionar un reporte existente:';

  const currency = orderWithBrand.giftcards[0]?.brandCountry?.country?.currency || 'USD';

  for (const card of order.giftcards) {
    const isReported = card.status !== 'UNUSED' && card.status !== 'USED';
    const claimCode = escapeHTML(decrypt(card.claimCode));
    const suffix = claimCode.slice(-4);

    let icon = '✅';
    let statusTxt = '(SIN REPORTAR)';
    let amountTxt = `${fmt$(card.amount, currency)}`;

    if (isReported) {
      if (card.status === 'WRONG_AMOUNT') {
        icon = '';
        statusTxt = '(WRONG_AMOUNT)';
        amountTxt = `${strike(fmt$(card.amount, currency))} → ${fmt$(card.reportedAmount ?? 0, currency)}`;
      } else {
        icon = '🚫';
        statusTxt = `(${card.status})`;
        amountTxt = `${strike(fmt$(card.amount, currency))}`;
      }
    }

    const label = `${icon} ${suffix} - ${amountTxt} ${statusTxt}`;
    const truncatedLabel = label.length > 60 ? label.slice(0, 57) + '...' : label;
    kb.text(truncatedLabel, `report_card_${card.id}`).row();
  }

  kb.text('⬅️ Volver al detalle', `order_detail_${orderId}`);
  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleReportCardSelect(ctx: BuyerContext) {
  const cardId = ctx.callbackQuery?.data?.replace('report_card_', '');
  if (!cardId) return ctx.answerCallbackQuery();

  const card = await prisma.giftcard.findUnique({
    where: { id: cardId },
    include: { order: true, brandCountry: { include: { brand: true, country: true } } },
  });

  if (!card || card.order?.userId !== ctx.user.id) return ctx.answerCallbackQuery('Tarjeta no encontrada');

  ctx.session.wizard.reportCardId = cardId;
  ctx.session.wizard.orderId = card.orderId!;

  const isReported = card.status !== 'UNUSED' && card.status !== 'USED';

  if (isReported) {
    const kb = new InlineKeyboard()
      .text('✏️ Modificar reporte', 'report_modify')
      .row()
      .text('🗑️ Eliminar reporte', 'report_delete')
      .row()
      .text('⬅️ Volver', `report_issues_${card.orderId}`);

    const currency = card.brandCountry?.country?.currency || 'USD';
    let reportDetail =
      `🚩 <b>Reporte actual:</b>\n\n` +
      `Tarjeta: ${escapeHTML(card.brandCountry.brand.name)}\n` +
      `Tipo: ${fmtGiftcardStatus(card.status)}\n`;

    if (card.status === 'WRONG_AMOUNT' && card.reportedAmount) {
      reportDetail += `Monto reportado: <b>${fmt$(card.reportedAmount, currency)}</b>\n`;
    }

    await renderUI(ctx, reportDetail, { parse_mode: 'HTML', reply_markup: kb });
    return;
  }

  return showReportTypes(ctx);
}

async function showReportTypes(ctx: BuyerContext) {
  const orderId = ctx.session.wizard.orderId;
  const kb = new InlineKeyboard()
    .text('❌ Código Inválido', 'report_type_INVALID')
    .row()
    .text('♻️ Ya Canjeado', 'report_type_ALREADY_USED')
    .row()
    .text('🚫 Desactivada', 'report_type_DEACTIVATED')
    .row()
    .text('📉 Monto Incorrecto', 'report_type_WRONG_AMOUNT')
    .row()
    .text('⬅️ Volver', `report_issues_${orderId}`);

  await renderUI(ctx, '🚩 <b>¿Qué tipo de problema tiene la tarjeta?</b>', {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

export async function handleReportModify(ctx: BuyerContext) {
  return showReportTypes(ctx);
}

export async function handleReportDelete(ctx: BuyerContext) {
  const { reportCardId, orderId } = ctx.session.wizard;
  if (!reportCardId || !orderId) return ctx.answerCallbackQuery('Error en la sesión');

  try {
    await deleteGiftcardIssue(reportCardId, orderId, ctx.user.id);
  } catch (err) {
    return renderUI(ctx, `❌ ${escapeHTML((err as Error).message)}`, {
      reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
    });
  }

  const kb = new InlineKeyboard().text('⬅️ Volver a la lista', `report_issues_${orderId}`);
  await renderUI(ctx, '✅ <b>Reporte eliminado.</b>\n\nLa tarjeta volvió a estar marcada como sin usar.', {
    parse_mode: 'HTML',
    reply_markup: kb,
    callbackText: 'Reporte eliminado',
  });
}

export async function handleReportTypeSelect(ctx: BuyerContext) {
  const type = ctx.callbackQuery?.data?.replace('report_type_', '') as any;
  if (!type) return ctx.answerCallbackQuery();

  ctx.session.wizard.reportIssueType = type;

  if (type === 'WRONG_AMOUNT') {
    ctx.session.wizard.step = 'awaitingReportAmount';
    await renderUI(ctx, '📉 <b>¿Cuál es el monto real que tiene la tarjeta?</b>\n\nIngresá solo el número (ejemplo: 50):', {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('❌ Cancelar', `report_type_WRONG_AMOUNT`),
    });
    return;
  }

  return requestProof(ctx);
}

export async function handleReportAmountText(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingReportAmount') return;

  const text = (ctx.message as any)?.text?.trim();
  const amount = parseFloat(text);

  await deleteUserInput(ctx);

  if (isNaN(amount) || amount <= 0) {
    return renderUI(ctx, '❌ Por favor, ingresá un monto válido (solo números).', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver', `report_type_WRONG_AMOUNT`),
    });
  }

  ctx.session.wizard.reportAmount = amount;
  return requestProof(ctx);
}

async function requestProof(ctx: BuyerContext) {
  ctx.session.wizard.step = 'awaitingReportProof';
  const kb = new InlineKeyboard().text('⏭️ Omitir prueba', 'report_proof_skip').row();

  const msg =
    '📸 <b>Enviá una captura de pantalla (opcional)</b>\n\nPara agilizar el proceso, podés enviar una imagen que sirva de prueba del error:';

  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleReportProofPhoto(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingReportProof') return;

  const photo = ctx.message?.photo?.pop();
  if (!photo) return;

  await deleteUserInput(ctx);

  ctx.session.wizard.reportProofUrl = photo.file_id;
  return submitReport(ctx);
}

export async function handleReportProofSkip(ctx: BuyerContext) {
  ctx.session.wizard.reportProofUrl = undefined;
  return submitReport(ctx);
}

async function submitReport(ctx: BuyerContext) {
  const { reportCardId, orderId, reportIssueType, reportAmount, reportProofUrl } = ctx.session.wizard;
  if (!reportCardId || !orderId || !reportIssueType) {
    return renderUI(ctx, '❌ Error en la sesión. Empezá de nuevo desde /orders.', {
      reply_markup: new InlineKeyboard().text('🏠 Inicio', 'start'),
    });
  }

  try {
    await reportGiftcardIssue({
      giftcardId: reportCardId,
      orderId,
      userId: ctx.user.id,
      issueType: reportIssueType,
      reportedAmount: reportAmount,
      proofImageUrl: reportProofUrl,
    });

    ctx.session.wizard.step = 'idle';
    ctx.session.wizard.reportCardId = undefined;
    ctx.session.wizard.reportIssueType = undefined;
    ctx.session.wizard.reportAmount = undefined;
    ctx.session.wizard.reportProofUrl = undefined;

    return handleReportIssues(ctx);
  } catch (err) {
    console.error('[Report] Error:', err);
    await renderUI(ctx, '❌ Error al procesar el reporte. Intentá de nuevo.', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
    });
  }
}
