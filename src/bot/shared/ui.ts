import { InlineKeyboard } from 'grammy';
import type { BotContext } from './types.js';
import { truncateForTelegram } from '@/lib/utils/html';
import prisma from '@/lib/prisma';
import { getTopicName, getOrCreateTopicId, isTopicGoneError, tryReopenTopic, resetFlowTopicId } from '@/lib/notifications';
import { logger } from '@/lib/logger';

// Re-export for bot consumers
export { escapeHTML, truncateForTelegram } from '@/lib/utils/html';

// Feature flag: separación de topics en el chat privado del bot
// (forum topic mode en chats privados, Bot API 10.x). Si está apagado o el bot
// no tiene topic mode habilitado, todo cae en General (comportamiento legacy).
const TOPICS_ENABLED = process.env.NOTIFICATIONS_TOPIC_ENABLED === 'true';

/**
 * Resuelve el message_thread_id del topic "🤖 Menú" para este usuario.
 *
 * Cadena de resolución (conservadora — nunca adopta threads entrantes porque
 * no hay forma confiable de distinguir General de un topic custom):
 * 1. Cache de sesión (persistida en BotSession, con validación de chatId)
 * 2. TelegramUser.flowTopicId (durable) — validando chatId:
 *    los topic ids son por (bot, chat), un id de otro chat es inválido
 * 3. Creación lazy vía createForumTopic + persistencia atómica (SOLO usuarios
 *    vinculados, con TelegramUser row — crear topics sin persistir genera
 *    duplicados cuando Telegram reenvía updates o hay multi-instancia)
 * 4. undefined → el caller envía a General (fallback seguro)
 *
 * INVARIANTES:
 * - NUNCA crea topics fuera de chats privados (guard chat.type)
 * - NUNCA crea topics sin persistir (sin userId)
 * - Los topic ids son por (bot, chat) — siempre validar flowChatId
 */
export async function resolveFlowThreadId(ctx: BotContext): Promise<number | undefined> {
  if (!TOPICS_ENABLED) return undefined;

  // Guard: solo chats privados (en privado, chat.id === from.id)
  if (ctx.chat != null && ctx.chat.type !== 'private') return undefined;

  const chatId = ctx.chat?.id || ctx.from?.id;
  if (!chatId) return undefined;
  const chatIdStr = String(chatId);

  // 1. Cache de sesión (con validación de chatId)
  const session = ctx.session;
  if (session.flowTopicId != null) {
    if (session.flowChatId == null) session.flowChatId = chatIdStr;
    if (session.flowChatId === chatIdStr) return session.flowTopicId;
    session.flowTopicId = undefined;
    session.flowChatId = undefined;
  }

  // 2. Lookup en DB: ctx.user (post-auth) o por telegramId (registro completado en este update)
  const userId = ctx.user?.id as string | undefined;
  let storedTopicId: number | null = null;
  let storedChatId: string | null = null;
  let resolvedUserId: string | undefined = userId;

  if (userId) {
    const row = await prisma.telegramUser.findUnique({
      where: { userId },
      select: { flowTopicId: true, flowChatId: true },
    });
    storedTopicId = row?.flowTopicId ?? null;
    storedChatId = row?.flowChatId ?? null;
  } else if (ctx.from?.id) {
    // Durante el último paso del registro (handleRegOtp), la fila
    // TelegramUser ya fue creada pero ctx.user aún no está seteado por auth.
    // Buscamos por telegramId para detectar esto y persistir el topic correctamente.
    const tgRow = await prisma.telegramUser.findUnique({
      where: { telegramId: ctx.from.id.toString() },
      select: { userId: true, flowTopicId: true, flowChatId: true },
    });
    if (!tgRow) return undefined; // No vinculado → General
    resolvedUserId = tgRow.userId;
    storedTopicId = tgRow.flowTopicId ?? null;
    storedChatId = tgRow.flowChatId ?? null;
  } else {
    return undefined;
  }

  // 3. Crear topic + persistir con claim atómico
  const topicId = await getOrCreateTopicId({
    api: ctx.api,
    chatId,
    name: getTopicName('flow', ctx.botRole),
    field: 'flowTopicId',
    userId: resolvedUserId,
    storedTopicId,
    storedChatId,
  });

  if (topicId != null) {
    const existedBefore = storedTopicId != null;
    if (!existedBefore) {
      logger.info(`[Topics] Nuevo flow topic creado: ${topicId} para user ${resolvedUserId}`);
    }
    session.flowTopicId = topicId;
    session.flowChatId = chatIdStr;
    return topicId;
  }

  return undefined;
}

/**
 * Safely deletes a user's input message (text, command, photo).
 */
export async function deleteUserInput(ctx: BotContext): Promise<void> {
  if (ctx.callbackQuery) return;
  if (!ctx.message) return;
  try {
    await ctx.deleteMessage();
  } catch (_err) {
    // Silencioso, a veces el mensaje ya no existe
  }
}

/**
 * Renders the UI in a single message.
 * Attempts to edit the existing uiMessageId. If it fails or doesn't exist,
 * sends a new message and updates uiMessageId in session.
 */
export async function renderUI(
  ctx: BotContext,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'MarkdownV2';
    reply_markup?: InlineKeyboard | { inline_keyboard: any[][] } | { remove_keyboard: true };
    /** If true, forces sending a new message instead of editing */
    forceNew?: boolean;
    /** Toast text to show when answering the callback query (only used if ctx.callbackQuery) */
    callbackText?: string;
  },
): Promise<void> {
  const session = ctx.session;
  const parseMode = options?.parse_mode || 'HTML';
  const replyMarkup = options?.reply_markup;

  // Responder callback queries siempre, con toast opcional
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery(options?.callbackText).catch(() => {});
  }

  // Obtener el chat ID correcto - usar from.id como fallback si chat no está disponible
  const chatId = ctx.chat?.id || ctx.from?.id;
  if (!chatId) return;

  // Limpiar uiMessageId si es muy viejo o estamos en un chat diferente
  if (session.uiMessageId && session.lastChatId !== chatId) {
    session.uiMessageId = undefined;
  }
  session.lastChatId = chatId;

  // Intentar editar si existe un ID y no se fuerza uno nuevo
  // (los edits van por messageId — no necesitan message_thread_id)
  if (!options?.forceNew && session.uiMessageId) {
    try {
      await ctx.api.editMessageText(chatId, session.uiMessageId, truncateForTelegram(text), {
        parse_mode: parseMode,
        reply_markup: replyMarkup as any,
      });
      return;
    } catch (err: any) {
      // Si el contenido es igual, no hacemos nada
      if (err?.message?.includes('message is not modified')) {
        return;
      }
      // Si falló por cualquier otra razón (ej: mensaje borrado o muy viejo),
      // limpiamos el ID y procedemos a enviar uno nuevo.
      session.uiMessageId = undefined;
    }
  }

  // Enviar mensaje nuevo — dentro del topic "🤖 Menú" si topic mode está activo
  const oldMessageId = session.uiMessageId;
  const safeText = truncateForTelegram(text);
  let threadId = await resolveFlowThreadId(ctx);

  // Hasta 2 intentos con thread: si el usuario borró/cerró el topic, se recrea
  // (o reabre) y se reintenta una vez. Si aún falla, fallback final a General —
  // NUNCA dejar al usuario sin UI.
  let sendWithThreadFailed = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const newMsg = await ctx.reply(safeText, {
        parse_mode: parseMode,
        reply_markup: replyMarkup as any,
        ...(threadId != null ? { message_thread_id: threadId } : {}),
      });

      session.uiMessageId = newMsg.message_id;

      // AHORA borramos el viejo, solo si el nuevo salió bien y es el mismo chat
      if (oldMessageId && oldMessageId !== newMsg.message_id) {
        await ctx.api.deleteMessage(chatId, oldMessageId).catch(() => {});
      }
      return;
    } catch (err: any) {
      const errorMessage: string = err?.message ?? '';

      // Topic borrado ("thread not found") o cerrado ("topic closed") por el usuario
      if (threadId != null && attempt === 0 && isTopicGoneError(errorMessage)) {
        // Si está cerrado, intentar reabrir conservando el historial
        const reopened = await tryReopenTopic(ctx.api, chatId, threadId);
        if (!reopened) {
          // Borrado (o reopen falló): limpiar cache + DB, recrear y reintentar
          session.flowTopicId = undefined;
          session.flowChatId = undefined;
          const userId = ctx.user?.id as string | undefined;
          if (userId) await resetFlowTopicId(userId);
          threadId = await resolveFlowThreadId(ctx);
        }
        continue;
      }

      // Fallback: HTML inválido → texto plano
      if (parseMode === 'HTML' && errorMessage.includes("can't parse entities")) {
        try {
          const plainText = truncateForTelegram(text.replace(/<[^>]*>/g, ''));
          const fallbackMsg = await ctx.reply(plainText, {
            reply_markup: replyMarkup as any,
            ...(threadId != null ? { message_thread_id: threadId } : {}),
          });
          session.uiMessageId = fallbackMsg.message_id;

          if (oldMessageId) {
            await ctx.api.deleteMessage(chatId, oldMessageId).catch(() => {});
          }
        } catch (_innerErr) {
          // Fallback falló silenciosamente
        }
        return;
      }

      // El segundo intento con thread falló → fallback final a General
      if (threadId != null && attempt === 1) {
        sendWithThreadFailed = true;
        break;
      }
      return;
    }
  }

  // Fallback final: mensaje sin thread (General). Solo se alcanza si los dos
  // intentos con thread fallaron — garantiza que el usuario SIEMPRE recibe UI.
  if (sendWithThreadFailed) {
    try {
      const newMsg = await ctx.reply(safeText, {
        parse_mode: parseMode,
        reply_markup: replyMarkup as any,
      });
      session.uiMessageId = newMsg.message_id;
      if (oldMessageId && oldMessageId !== newMsg.message_id) {
        await ctx.api.deleteMessage(chatId, oldMessageId).catch(() => {});
      }
    } catch (_err) {
      // Silencioso — no hay más fallback posible
    }
  }
}

/**
 * Helper para agregar un botón "Volver" genérico
 */
export function addBackButton(kb: InlineKeyboard, action: string, text = '⬅️ Volver') {
  return kb.row().text(text, action);
}
