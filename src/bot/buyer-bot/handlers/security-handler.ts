import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BuyerContext } from '@/bot/shared/types.js';
import { renderUI, deleteUserInput } from '@/bot/shared/ui.js';
import {
  orderNeedsSecurityGate,
  isSecurityUnlocked,
  getSecurityStatus,
  verifySecurityPin,
  verifyPinAndUnlock,
  setSecurityPin,
  changeSecurityPin,
  grantSecurityUnlock,
  requestPinReset,
  verifyPinResetOtp,
  confirmPinReset,
  isValidPinFormat,
  SecurityPinError,
} from '@/lib/services/security';
import { createLogger } from '@/lib/logger';

const buyerLogger = createLogger('buyer-bot');

/**
 * Security PIN gate (buyer bot) — protege la revelación de códigos de órdenes
 * con cards sin confirmar. Espejo del UnlockGate web (donde además hay passkey).
 *
 * Flujos:
 * - Gate: withSecurityGate() se llama ANTES de cualquier render con códigos.
 *   Si aplica, pide PIN (o fuerza setup si el buyer no tiene) y guarda la orden
 *   pendiente en sesión; tras el unlock se re-renderiza (revealPendingOrder).
 * - Recuperación: "Olvidé mi PIN" → OTP por email → nuevo PIN (wizard).
 * - Menú: sec_menu permite cambiar el PIN o iniciar la recuperación.
 *
 * Higiene: todo handler de texto que recibe PIN/OTP borra el mensaje del usuario.
 */

// ── Gate ─────────────────────────────────────────────────────────────────────

/**
 * Si la orden requiere unlock y el buyer no lo tiene vigente, inicia el flujo
 * de verificación y devuelve `true` (el caller NO debe renderizar códigos).
 * Si no aplica (orden confirmada o unlock vigente), devuelve `false`.
 */
export async function withSecurityGate(ctx: BuyerContext, orderId: string, source: 'buy' | 'detail'): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, giftcards: { select: { isConfirmed: true } } },
  });
  if (!order || order.userId !== ctx.user.id) return false;
  if (!orderNeedsSecurityGate(order.giftcards)) return false;
  if (await isSecurityUnlocked(ctx.user.id)) return false;

  ctx.session.wizard.pendingRevealOrderId = orderId;
  ctx.session.wizard.pendingRevealSource = source;

  const status = await getSecurityStatus(ctx.user.id);
  const kb = new InlineKeyboard();

  if (!status.hasPin) {
    ctx.session.wizard.step = 'awaitingPinSetup';
    kb.text('❌ Cancelar', 'sec_cancel');
    await renderUI(
      ctx,
        `🔐 <b>Protege tus códigos</b>\n\n` +
        `Antes de mostrar los códigos de tu orden, crea un <b>PIN de seguridad</b> (4 a 6 dígitos).\n` +
        `Te lo pediremos cada vez que quieras ver códigos de órdenes nuevas.\n\n` +
        `👇 Escribe tu nuevo PIN:`,
      { parse_mode: 'HTML', reply_markup: kb },
    );
    return true;
  }

  ctx.session.wizard.step = 'awaitingSecurityPin';
  kb.text('📧 Olvidé mi PIN', 'sec_pin_forgot').row().text('📋 Ver Mis órdenes', 'my_orders');
  const lockedNote = status.pinLocked
    ? '\n\n⚠️ <b>Tu PIN está bloqueado por intentos fallidos.</b> Usa "Olvidé mi PIN" para restablecerlo.'
    : '';
  await renderUI(ctx, `🔐 <b>Códigos protegidos</b>\n\n Ingresa tu <b>PIN de seguridad</b> para ver los códigos:${lockedNote}`, {
    parse_mode: 'HTML',
    reply_markup: kb,
    callbackText: '🔐 Verificación requerida',
  });
  return true;
}

/** Re-renderiza la orden pendiente tras un unlock exitoso. */
async function revealPendingOrder(ctx: BuyerContext) {
  const orderId = ctx.session.wizard.pendingRevealOrderId;
  const source = ctx.session.wizard.pendingRevealSource;
  ctx.session.wizard.pendingRevealOrderId = undefined;
  ctx.session.wizard.pendingRevealSource = undefined;
  ctx.session.wizard.step = 'idle';

  if (!orderId) {
    return renderUI(ctx, '✅ <b>Identidad verificada.</b>', {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('📋 Ver Mis órdenes', 'my_orders').row().text('🏠 Volver al Menú', 'start'),
    });
  }

  // Lazy imports: evitan ciclo buy-handler ↔ security-handler ↔ orders-handler
  if (source === 'buy') {
    const { renderOrderCreatedReveal } = await import('./buy-handler.js');
    return renderOrderCreatedReveal(ctx, orderId);
  }
  const { renderOrderDetail } = await import('./orders-handler.js');
  return renderOrderDetail(ctx, orderId, 1);
}

// ── Callbacks ────────────────────────────────────────────────────────────────

/** Botón "🔓 Desbloquear códigos" del detalle de orden. */
export async function handleSecUnlock(ctx: BuyerContext) {
  const orderId = ctx.callbackQuery?.data?.replace('sec_unlock_', '');
  if (!orderId) return ctx.answerCallbackQuery();
  await ctx.answerCallbackQuery();

  const gated = await withSecurityGate(ctx, orderId, 'detail');
  if (!gated) {
    const { renderOrderDetail } = await import('./orders-handler.js');
    await renderOrderDetail(ctx, orderId, 1);
  }
}

/** Cancela cualquier flujo de seguridad en curso. */
export async function handleSecCancel(ctx: BuyerContext) {
  clearSecuritySession(ctx);
  await ctx.answerCallbackQuery('Operación cancelada');
  await renderUI(ctx, '❌ Operación cancelada.', {
    reply_markup: new InlineKeyboard().text('📋 Ver Mis órdenes', 'my_orders').row().text('🏠 Volver al Menú', 'start'),
  });
}

/** "📧 Olvidé mi PIN" — envía OTP al email de la cuenta. */
export async function handleSecPinForgot(ctx: BuyerContext) {
  await ctx.answerCallbackQuery();
  try {
    await requestPinReset(ctx.user.id);
  } catch (error) {
    const msg = error instanceof SecurityPinError ? error.message : 'No se pudo enviar el email. Intenta más tarde.';
    return renderUI(ctx, `❌ ${msg}`, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('⬅️ Volver', 'start'),
    });
  }
  ctx.session.wizard.step = 'awaitingPinResetOtp';
  await renderUI(
    ctx,
    `📧 <b>Código enviado</b>\n\nTe envié un código de 6 dígitos al email de tu cuenta (válido por 10 minutos).\n\n👇 Escribí el código:`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    },
  );
}

/** Menú "🔐 Seguridad" — estado del PIN + acciones. */
export async function handleSecMenu(ctx: BuyerContext) {
  await ctx.answerCallbackQuery().catch(() => {});
  const status = await getSecurityStatus(ctx.user.id);

  const kb = new InlineKeyboard();
  if (status.hasPin && !status.pinLocked) {
    kb.text('🔑 Cambiar PIN', 'sec_change_pin').row();
  }
  if (status.hasPin) {
    kb.text('📧 Restablecer por email', 'sec_pin_forgot').row();
  } else {
    kb.text('🛡 Crear PIN', 'sec_create_pin').row();
  }
  kb.text('🏠 Volver al Menú', 'start');

  const stateTxt = !status.hasPin
    ? '⚠️ <b>Sin PIN configurado.</b> Te lo pediremos al revelar códigos de órdenes nuevas.'
    : status.pinLocked
      ? '🔒 <b>PIN bloqueado</b> por intentos fallidos. Restablecelo por email.'
      : '✅ <b>PIN activo.</b> Protege los códigos de tus órdenes nuevas.';

  await renderUI(ctx, `🔐 <b>Seguridad de códigos</b>\n\n${stateTxt}`, { parse_mode: 'HTML', reply_markup: kb });
}

/** Inicia el setup de PIN desde el menú (sin orden pendiente). */
export async function handleSecCreatePin(ctx: BuyerContext) {
  await ctx.answerCallbackQuery();
  ctx.session.wizard.pendingRevealOrderId = undefined;
  ctx.session.wizard.pendingRevealSource = undefined;
  ctx.session.wizard.step = 'awaitingPinSetup';
  await renderUI(ctx, '🛡 <b>Crear PIN de seguridad</b>\n\n👇 Escribe tu nuevo PIN (4 a 6 dígitos):', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Inicia el cambio de PIN (requiere el actual). */
export async function handleSecChangePin(ctx: BuyerContext) {
  await ctx.answerCallbackQuery();
  ctx.session.wizard.step = 'awaitingPinChangeCurrent';
  await renderUI(ctx, '🔑 <b>Cambiar PIN</b>\n\n👇 Escribe tu PIN <b>actual</b>:', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

// ── Text handlers (wizard) ───────────────────────────────────────────────────

function clearSecuritySession(ctx: BuyerContext) {
  ctx.session.wizard.securityPinDraft = undefined;
  ctx.session.wizard.securityPinCurrent = undefined;
  ctx.session.wizard.securityResetOtp = undefined;
  ctx.session.wizard.pendingRevealOrderId = undefined;
  ctx.session.wizard.pendingRevealSource = undefined;
}

async function promptRetry(ctx: BuyerContext, message: string, kb?: InlineKeyboard) {
  await renderUI(ctx, `❌ ${message}`, {
    parse_mode: 'HTML',
    reply_markup: kb ?? new InlineKeyboard().text('📧 Olvidé mi PIN', 'sec_pin_forgot').row().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Paso: ingreso de PIN para desbloquear códigos. */
export async function handleSecurityPinText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  try {
    await verifyPinAndUnlock(ctx.user.id, pin);
  } catch (error) {
    if (error instanceof SecurityPinError) {
      if (error.code === 'PIN_LOCKED') {
        ctx.session.wizard.step = 'idle';
        return renderUI(ctx, `🔒 ${error.message}`, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('📧 Restablecer por email', 'sec_pin_forgot').row().text('🏠 Volver al Menú', 'start'),
        });
      }
      return promptRetry(ctx, `${error.message}\n\n👇 Intenta de nuevo:`);
    }
    throw error;
  }

  buyerLogger.action('buy', 'bot-security-unlock', 'Códigos desbloqueados via PIN en bot', { userId: ctx.user.id });
  await revealPendingOrder(ctx);
}

/** Paso 1 setup: nuevo PIN. */
export async function handlePinSetupText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (!isValidPinFormat(pin)) {
    return promptRetry(
      ctx,
      'El PIN debe tener entre 4 y 6 dígitos numéricos.\n\n👇 Intenta de nuevo:',
      new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    );
  }
  ctx.session.wizard.securityPinDraft = pin;
  ctx.session.wizard.step = 'awaitingPinSetupConfirm';
  await renderUI(ctx, '🔁 <b>Confirma tu PIN</b>\n\n👇 Escríbelo de nuevo:', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Paso 2 setup: confirmación. */
export async function handlePinSetupConfirmText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (pin !== ctx.session.wizard.securityPinDraft) {
    ctx.session.wizard.securityPinDraft = undefined;
    ctx.session.wizard.step = 'awaitingPinSetup';
    return promptRetry(
      ctx,
      'Los PIN no coinciden.\n\n👇 Escribe tu nuevo PIN otra vez:',
      new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    );
  }

  try {
    await setSecurityPin(ctx.user.id, pin);
  } catch (error) {
    clearSecuritySession(ctx);
    ctx.session.wizard.step = 'idle';
    const msg = error instanceof SecurityPinError ? error.message : 'No se pudo guardar el PIN.';
    return renderUI(ctx, `❌ ${msg}`, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🏠 Volver al Menú', 'start'),
    });
  }

  ctx.session.wizard.securityPinDraft = undefined;
  await grantSecurityUnlock(ctx.user.id);
  buyerLogger.action('buy', 'bot-security-pin-set', 'PIN de seguridad configurado via bot', { userId: ctx.user.id });
  await revealPendingOrder(ctx);
}

/** Paso 1 reset: OTP del email — validado inmediatamente contra la DB. */
export async function handlePinResetOtpText(ctx: BuyerContext) {
  const otp = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (!/^\d{6}$/.test(otp)) {
    return promptRetry(ctx, 'El código tiene 6 dígitos.\n\n👇 Intenta de nuevo:', new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'));
  }

  try {
    await verifyPinResetOtp(ctx.user.id, otp);
  } catch (error) {
    if (error instanceof SecurityPinError) {
      if (error.code === 'OTP_MAX_ATTEMPTS' || error.code === 'OTP_EXPIRED' || error.code === 'OTP_NOT_FOUND') {
        ctx.session.wizard.step = 'idle';
        return promptRetry(
          ctx,
          error.message,
          new InlineKeyboard().text('📧 Solicitar nuevo código', 'sec_pin_forgot').row().text('🏠 Volver al Menú', 'start'),
        );
      }
      return promptRetry(ctx, error.message + '\n\n👇 Ingresa el código de nuevo:', new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'));
    }
    throw error;
  }

  ctx.session.wizard.securityResetOtp = otp;
  ctx.session.wizard.step = 'awaitingPinResetNewPin';
  await renderUI(ctx, '🛡 <b>Nuevo PIN</b>\n\n👇 Escribe tu nuevo PIN (4 a 6 dígitos):', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Paso 2 reset: nuevo PIN. */
export async function handlePinResetNewPinText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (!isValidPinFormat(pin)) {
    return promptRetry(
      ctx,
      'El PIN debe tener entre 4 y 6 dígitos numéricos.\n\n👇 Intenta de nuevo:',
      new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    );
  }
  ctx.session.wizard.securityPinDraft = pin;
  ctx.session.wizard.step = 'awaitingPinResetConfirm';
  await renderUI(ctx, '🔁 <b>Confirma tu nuevo PIN</b>\n\n👇 Escríbelo de nuevo:', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Paso 3 reset: confirmación + cambio efectivo. */
export async function handlePinResetConfirmText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (pin !== ctx.session.wizard.securityPinDraft) {
    ctx.session.wizard.securityPinDraft = undefined;
    ctx.session.wizard.step = 'awaitingPinResetNewPin';
    return promptRetry(
      ctx,
      'Los PIN no coinciden.\n\n👇 Escribe tu nuevo PIN otra vez:',
      new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    );
  }

  const otp = ctx.session.wizard.securityResetOtp;
  if (!otp) {
    clearSecuritySession(ctx);
    ctx.session.wizard.step = 'idle';
    return renderUI(ctx, '❌ Sesión expirada. Inicia la recuperación de nuevo.', {
      reply_markup: new InlineKeyboard().text('🏠 Volver al Menú', 'start'),
    });
  }

  try {
    await confirmPinReset(ctx.user.id, otp, pin);
  } catch (error) {
    if (error instanceof SecurityPinError) {
      if (error.code === 'OTP_INVALID') {
        ctx.session.wizard.step = 'awaitingPinResetOtp';
        return promptRetry(
          ctx,
          `${error.message}\n\n👇 Ingresa el código de nuevo:`,
          new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
        );
      }
      clearSecuritySession(ctx);
      ctx.session.wizard.step = 'idle';
      return renderUI(ctx, `❌ ${error.message}`, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('📧 Solicitar nuevo código', 'sec_pin_forgot').row().text('🏠 Volver al Menú', 'start'),
      });
    }
    throw error;
  }

  clearSecuritySessionFieldsOnly(ctx);
  await grantSecurityUnlock(ctx.user.id);
  buyerLogger.action('buy', 'bot-security-pin-reset', 'PIN restablecido via email OTP en bot', { userId: ctx.user.id });
  await renderUI(ctx, '✅ <b>PIN restablecido con éxito.</b>', { parse_mode: 'HTML' });
  await revealPendingOrder(ctx);
}

/** Paso 1 cambio: PIN actual. */
export async function handlePinChangeCurrentText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  try {
    await verifySecurityPin(ctx.user.id, pin);
  } catch (error) {
    if (error instanceof SecurityPinError) {
      if (error.code === 'PIN_LOCKED') {
        ctx.session.wizard.step = 'idle';
        return renderUI(ctx, `🔒 ${error.message}`, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('📧 Restablecer por email', 'sec_pin_forgot').row().text('🏠 Volver al Menú', 'start'),
        });
      }
      return promptRetry(ctx, `${error.message}\n\n👇 Intenta de nuevo:`, new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'));
    }
    throw error;
  }

  // Verificado: se guarda transitoriamente para re-verificar en el paso final
  // (changeSecurityPin lo valida de nuevo antes de cambiar).
  ctx.session.wizard.securityPinCurrent = pin;
  ctx.session.wizard.step = 'awaitingPinChangeNew';
  await renderUI(ctx, '🛡 <b>Nuevo PIN</b>\n\n👇 Escribe tu nuevo PIN (4 a 6 dígitos):', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Paso 2 cambio: nuevo PIN. */
export async function handlePinChangeNewText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (!isValidPinFormat(pin)) {
    return promptRetry(
      ctx,
      'El PIN debe tener entre 4 y 6 dígitos numéricos.\n\n👇 Intenta de nuevo:',
      new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    );
  }
  ctx.session.wizard.securityPinDraft = pin;
  ctx.session.wizard.step = 'awaitingPinChangeConfirm';
  await renderUI(ctx, '🔁 <b>Confirma tu nuevo PIN</b>\n\n👇 Escríbelo de nuevo:', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
  });
}

/** Paso 3 cambio: confirmación + cambio efectivo. */
export async function handlePinChangeConfirmText(ctx: BuyerContext) {
  const pin = ctx.message?.text?.trim() ?? '';
  await deleteUserInput(ctx);

  if (pin !== ctx.session.wizard.securityPinDraft) {
    ctx.session.wizard.securityPinDraft = undefined;
    ctx.session.wizard.step = 'awaitingPinChangeNew';
    return promptRetry(
      ctx,
      'Los PIN no coinciden.\n\n👇 Escribe tu nuevo PIN otra vez:',
      new InlineKeyboard().text('❌ Cancelar', 'sec_cancel'),
    );
  }

  const currentPin = ctx.session.wizard.securityPinCurrent;
  if (!currentPin) {
    clearSecuritySession(ctx);
    ctx.session.wizard.step = 'idle';
    return renderUI(ctx, '❌ Sesión expirada. Inicia el cambio de nuevo.', {
      reply_markup: new InlineKeyboard().text('🏠 Volver al Menú', 'start'),
    });
  }

  try {
    await changeSecurityPin(ctx.user.id, currentPin, pin);
  } catch (error) {
    clearSecuritySession(ctx);
    ctx.session.wizard.step = 'idle';
    const msg = error instanceof SecurityPinError ? error.message : 'No se pudo cambiar el PIN.';
    return renderUI(ctx, `❌ ${msg}`, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🏠 Volver al Menú', 'start'),
    });
  }

  clearSecuritySessionFieldsOnly(ctx);
  ctx.session.wizard.step = 'idle';
  buyerLogger.action('buy', 'bot-security-pin-change', 'PIN de seguridad cambiado via bot', { userId: ctx.user.id });
  await renderUI(ctx, '✅ <b>PIN actualizado con éxito.</b>', {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('🏠 Volver al Menú', 'start'),
  });
}

/** Limpia solo los campos sensibles (preserva pendingReveal para el reveal post-reset). */
function clearSecuritySessionFieldsOnly(ctx: BuyerContext) {
  ctx.session.wizard.securityPinDraft = undefined;
  ctx.session.wizard.securityPinCurrent = undefined;
  ctx.session.wizard.securityResetOtp = undefined;
}
