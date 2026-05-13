import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { fmt$, fmtOrderStatus, fmtGiftcardStatus, fmtDate } from '@/bot/shared/formatters.js';
import { decrypt } from '@/lib/encryption';

function strike(text: string) {
  return text
    .split('')
    .map((char) => char + '\u0336')
    .join('');
}

const PAGE_SIZE = 5;

export async function handleOrders(ctx: BuyerContext) {
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
    const kb = new InlineKeyboard().text('🛒 Comprar tarjetas', 'buy_start');
    return ctx.reply('📭 No tenés órdenes todavía.', { reply_markup: kb });
  }

  const kb = new InlineKeyboard();
  let msg = `📋 <b>Tus Órdenes</b> (Página ${page}/${totalPages})\n\n`;
  msg += '<b>Leyenda:</b>\n';
  msg += '<pre>🟢 Completada\n🔵 Esperando Pago\n🟡 Pendiente\n🔴 Cancelada</pre>\n\n';
  msg += 'Seleccioná una orden para ver sus detalles:';

  for (const order of orders) {
    let icon = '🟡'; // PENDING
    if (order.status === 'COMPLETED') {
      icon = '🟢';
    } else if (order.status === 'AWAITING_PAYMENT') {
      icon = '🔵';
    } else if (order.status === 'CANCELLED') {
      icon = '🔴';
    }

    const shortId = order.id.slice(-8).toUpperCase();
    const dateStr = fmtDate(order.createdAt);
    const label = `${icon} Orden #${shortId} · ${dateStr}`;

    kb.text(label, `order_detail_${order.id}_${page}`).row();
  }

  // Pagination buttons
  const hasNext = skip + PAGE_SIZE < totalCount;
  const hasPrev = page > 1;

  if (hasPrev || hasNext) {
    kb.row();
    if (hasPrev) kb.text('⬅️ Más recientes', `my_orders_${page - 1}`);
    if (hasNext) kb.text('Anteriores ➡️', `my_orders_${page + 1}`);
    kb.row();
  }

  kb.text('🏠 Volver al Menú', 'start');

  if (ctx.callbackQuery) {
    return ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
  }
  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleOrderDetail(ctx: BuyerContext) {
  const data = ctx.callbackQuery?.data?.split('_') || [];
  const orderId = data[2];
  const fromPage = parseInt(data[3] || '1');

  if (!orderId) return ctx.answerCallbackQuery();

  ctx.session.wizard.orderId = orderId;

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

  const { Prisma } = await import('@/generated/prisma/client');

  const nullifiedCards = order.giftcards.filter((c) => c.status !== 'UNUSED' && c.status !== 'USED' && c.status !== 'WRONG_AMOUNT');
  const availableCards = order.giftcards.filter((c) => c.status === 'UNUSED' || c.status === 'USED' || c.status === 'WRONG_AMOUNT');

  const totalGiftcardAmount = order.giftcards.reduce((sum, c) => {
    const amt = c.reportedAmount ?? c.amount;
    return sum.plus(amt);
  }, new Prisma.Decimal(0));

  const totalToPay =
    order.status === 'PENDING'
      ? order.giftcards.reduce((sum, card) => {
          if (card.status === 'UNUSED' || card.status === 'USED') return sum.plus(card.amount.mul(order.buyRate));
          if (card.status === 'WRONG_AMOUNT' && card.reportedAmount) return sum.plus(card.reportedAmount.mul(order.buyRate));
          return sum;
        }, new Prisma.Decimal(0))
      : (order.adjustedTotal ?? order.total);

  const discountPercent = (1 - order.buyRate.toNumber()) * 100;
  const discountAmount = totalGiftcardAmount.mul(new Prisma.Decimal(1).minus(order.buyRate));

  const invalidBlock =
    nullifiedCards.length > 0
      ? `<b>❌ Tarjetas inválidas / reportadas</b>\n` +
        nullifiedCards
          .map((c) => {
            const claimCode = decrypt(c.claimCode);
            return `• <code>${claimCode}</code> - ${strike(fmt$(c.amount))} - ${c.status}`;
          })
          .join('\n') +
        '\n\n'
      : '';

  const validBlock =
    availableCards.length > 0
      ? `<b>✅ Tarjetas verificadas</b>\n` +
        availableCards
          .map((c) => {
            const claimCode = decrypt(c.claimCode);
            const isWrong = c.status === 'WRONG_AMOUNT';
            const amt = c.reportedAmount ?? c.amount;

            if (isWrong) {
              return `• <code>${claimCode}</code> - ${strike(fmt$(c.amount))} → ${fmt$(amt)}`;
            }
            return `• <code>${claimCode}</code> - ${fmt$(amt)}`;
          })
          .join('\n') +
        '\n\n'
      : '';

  const summary = `<b>💰 Resumen financiero</b>
• Valor tarjetas: ${fmt$(totalGiftcardAmount)}
• Descuento (${discountPercent.toFixed(0)}%): -${fmt$(discountAmount)}
• <b>Total ${order.status === 'COMPLETED' ? 'pagado' : 'a pagar'}: ${fmt$(totalToPay)}</b>`;

  let instructions = '';
  if (order.status === 'PENDING') {
    if (totalToPay.isZero()) {
      instructions = `\n\n<b>⚠️ Total Cero</b>\nEl total de tu orden es $0.00. No se requiere pago. Podés <b>cancelar la orden</b> si ya no la necesitás.`;
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

  kb.text('📞 Contactar a Soporte', `https://t.me/admin`).row(); // Ajustar según env si existe
  kb.text('🔙 Regresar al historial', `my_orders_${fromPage}`);

  await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
  return ctx.answerCallbackQuery();
}

export async function handleCancelOrder(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('cancel_order_', '');
  if (!orderId) return ctx.answerCallbackQuery();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { giftcards: true },
  });

  if (!order || order.userId !== ctx.user.id) return ctx.answerCallbackQuery('Orden no encontrada');
  if (order.status !== 'PENDING') return ctx.answerCallbackQuery('Solo se pueden cancelar órdenes pendientes');

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
    await tx.giftcard.updateMany({
      where: { id: { in: order.giftcards.map((c) => c.id) } },
      data: { inStock: true, status: 'UNUSED' },
    });
    await tx.giftcardIssue.deleteMany({ where: { orderId } });
  });

  await ctx.editMessageText('❌ <b>Orden cancelada.</b>\n\nLas tarjetas han sido liberadas.', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('⬅️ Volver a mis órdenes', 'my_orders'),
  });
  return ctx.answerCallbackQuery('Orden cancelada');
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

  await prisma.$transaction(async (tx) => {
    const updatedSettings = await tx.platformSettings.upsert({
      where: { key: 'platformBalance' },
      update: { balance: { increment: paymentAmount } },
      create: { key: 'platformBalance', value: '', description: 'Balance General', balance: paymentAmount },
    });

    await tx.payment.create({
      data: {
        amount: paymentAmount,
        balanceAfter: updatedSettings.balance,
        direction: 'CREDIT',
        category: 'ORDER',
        orderId: order.id,
        binanceTxId: txId,
        relatedUserId: order.userId,
      },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
  });

  ctx.session.wizard.step = 'idle';
  ctx.session.wizard.orderId = undefined;

  const kb = new InlineKeyboard().text('📋 Ver mis órdenes', 'my_orders');

  return ctx.reply(`✅ <b>¡Pago registrado!</b>\n\nOrden completada por <b>${fmt$(paymentAmount)}</b>.\n\n<i>TxID: ${txId}</i>`, {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

// ── Problem Reporting ────────────────────────────────────────────────────────

export async function handleReportIssues(ctx: BuyerContext) {
  const data = ctx.callbackQuery?.data;
  const orderId =
    (data?.includes('report_issues') ? data.replace('report_issues_', '').replace('report_issues', '') : null) ||
    ctx.session.wizard.orderId;
  if (!orderId) return ctx.answerCallbackQuery?.('Error en la sesión');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { giftcards: { include: { brandCountry: { include: { brand: true } } } } },
  });

  if (!order || order.userId !== ctx.user.id) return ctx.answerCallbackQuery?.('Orden no encontrada');

  const kb = new InlineKeyboard();
  let msg = '🚩 <b>¿Con qué tarjeta tenés problemas?</b>\n\nSeleccioná una tarjeta para reportar o gestionar un reporte existente:';

  for (const card of order.giftcards) {
    const isReported = card.status !== 'UNUSED' && card.status !== 'USED';
    const claimCode = decrypt(card.claimCode);
    const suffix = claimCode.slice(-4);

    let icon = '✅';
    let statusTxt = '(SIN REPORTAR)';
    let amountTxt = `${fmt$(card.amount)}`;

    if (isReported) {
      if (card.status === 'WRONG_AMOUNT') {
        icon = '⚠️';
        statusTxt = '(WRONG_AMOUNT)';
        amountTxt = `${strike(fmt$(card.amount))} → ${fmt$(card.reportedAmount ?? 0)}`;
      } else {
        icon = '🚫';
        statusTxt = `(${card.status})`;
        amountTxt = `${strike(fmt$(card.amount))}`;
      }
    }

    const label = `${icon} ...${suffix} - ${amountTxt} ${statusTxt}`;
    const truncatedLabel = label.length > 60 ? label.slice(0, 57) + '...' : label;
    kb.text(truncatedLabel, `report_card_${card.id}`).row();
  }

  kb.text('⬅️ Volver al detalle', `order_detail_${orderId}`);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
    return ctx.answerCallbackQuery();
  } else {
    await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
  }
}

export async function handleReportCardSelect(ctx: BuyerContext) {
  const cardId = ctx.callbackQuery?.data?.replace('report_card_', '');
  if (!cardId) return ctx.answerCallbackQuery();

  const card = await prisma.giftcard.findUnique({
    where: { id: cardId },
    include: { order: true, brandCountry: { include: { brand: true } } },
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

    let reportDetail =
      `🚩 <b>Reporte actual:</b>\n\n` + `Tarjeta: ${card.brandCountry.brand.name}\n` + `Tipo: ${fmtGiftcardStatus(card.status)}\n`;

    if (card.status === 'WRONG_AMOUNT' && card.reportedAmount) {
      reportDetail += `Monto reportado: <b>${fmt$(card.reportedAmount)}</b>\n`;
    }

    await ctx.editMessageText(reportDetail, { parse_mode: 'HTML', reply_markup: kb });
    return ctx.answerCallbackQuery();
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

  await ctx.editMessageText('🚩 <b>¿Qué tipo de problema tiene la tarjeta?</b>', {
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

  await prisma.$transaction(async (tx) => {
    await tx.giftcardIssue.deleteMany({
      where: { giftcardId: reportCardId, orderId, reportedById: ctx.user.id },
    });

    const remaining = await tx.giftcardIssue.findFirst({ where: { giftcardId: reportCardId } });
    if (!remaining) {
      await tx.giftcard.update({
        where: { id: reportCardId },
        data: { status: 'UNUSED', reportedAmount: null },
      });
    }
  });

  const kb = new InlineKeyboard().text('⬅️ Volver a la lista', `report_issues_${orderId}`);
  await ctx.editMessageText('✅ <b>Reporte eliminado.</b>\n\nLa tarjeta volvió a estar marcada como sin usar.', {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
  return ctx.answerCallbackQuery('Reporte eliminado');
}

export async function handleReportTypeSelect(ctx: BuyerContext) {
  const type = ctx.callbackQuery?.data?.replace('report_type_', '') as any;
  if (!type) return ctx.answerCallbackQuery();

  ctx.session.wizard.reportIssueType = type;

  if (type === 'WRONG_AMOUNT') {
    ctx.session.wizard.step = 'awaitingReportAmount';
    await ctx.editMessageText('📉 <b>¿Cuál es el monto real que tiene la tarjeta?</b>\n\nIngresá solo el número (ejemplo: 50):');
    return ctx.answerCallbackQuery();
  }

  return requestProof(ctx);
}

export async function handleReportAmountText(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingReportAmount') return;

  const text = (ctx.message as any)?.text?.trim();
  const amount = parseFloat(text);

  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Por favor, ingresá un monto válido (solo números).');
  }

  ctx.session.wizard.reportAmount = amount;
  return requestProof(ctx);
}

async function requestProof(ctx: BuyerContext) {
  ctx.session.wizard.step = 'awaitingReportProof';
  const kb = new InlineKeyboard().text('⏭️ Omitir prueba', 'report_proof_skip').row();

  const msg =
    '📸 <b>Enviá una captura de pantalla (opcional)</b>\n\nPara agilizar el proceso, podés enviar una imagen que sirva de prueba del error:';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
    return ctx.answerCallbackQuery();
  } else {
    await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
  }
}

export async function handleReportProofPhoto(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingReportProof') return;

  const photo = ctx.message?.photo?.pop();
  if (!photo) return;

  // En un sistema real, subiríamos a S3/R2. Por ahora guardamos el file_id de Telegram
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
    return ctx.reply('❌ Error en la sesión. Empezá de nuevo desde /orders.');
  }

  const { Prisma } = await import('@/generated/prisma/client');

  try {
    const card = await prisma.giftcard.findUnique({
      where: { id: reportCardId },
      select: { ownerId: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.giftcardIssue.deleteMany({
        where: { giftcardId: reportCardId, orderId, reportedById: ctx.user.id },
      });

      await tx.giftcardIssue.create({
        data: {
          issueType: reportIssueType,
          reportedAmount: reportAmount ? new Prisma.Decimal(reportAmount) : undefined,
          giftcardId: reportCardId,
          orderId: orderId,
          reportedById: ctx.user.id,
          sellerId: card?.ownerId ?? undefined,
          proofImageUrl: reportProofUrl,
        },
      });

      await tx.giftcard.update({
        where: { id: reportCardId },
        data: {
          status: reportIssueType,
          reportedAmount: reportAmount ? new Prisma.Decimal(reportAmount) : undefined,
        },
      });
    });

    ctx.session.wizard.step = 'idle';
    ctx.session.wizard.reportCardId = undefined;
    ctx.session.wizard.reportIssueType = undefined;
    ctx.session.wizard.reportAmount = undefined;
    ctx.session.wizard.reportProofUrl = undefined;

    return handleReportIssues(ctx);
  } catch (err) {
    console.error('[Report] Error:', err);
    await ctx.reply('❌ Error al procesar el reporte. Intentá de nuevo.');
  }
}
