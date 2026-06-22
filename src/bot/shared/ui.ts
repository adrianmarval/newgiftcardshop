import { InlineKeyboard } from 'grammy';
import type { SellerContext, BuyerContext } from './types.js';

type BotContext = SellerContext | BuyerContext;

const TG_MAX_LEN = 4096;
const TRUNCATION_SUFFIX = '\n\n…(mensaje truncado)';

/**
 * Truncates text to fit Telegram's 4096 char limit, preserving a suffix indicator.
 */
export function truncateForTelegram(text: string): string {
  if (text.length <= TG_MAX_LEN) return text;
  const cut = TG_MAX_LEN - TRUNCATION_SUFFIX.length;
  return text.slice(0, cut) + TRUNCATION_SUFFIX;
}

/**
 * Escapes HTML special characters.
 */
export function escapeHTML(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (m) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[m] || m,
  );
}

/**
 * Safely deletes a user's input message (text, command, photo).
 */
export async function deleteUserInput(ctx: BotContext): Promise<void> {
  if (ctx.callbackQuery) return;
  if (!ctx.message) return;
  try {
    await ctx.deleteMessage();
  } catch (err) {
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

  // Enviar mensaje nuevo
  const oldMessageId = session.uiMessageId;
  const safeText = truncateForTelegram(text);
  try {
    const newMsg = await ctx.reply(safeText, {
      parse_mode: parseMode,
      reply_markup: replyMarkup as any,
    });

    session.uiMessageId = newMsg.message_id;

    // AHORA borramos el viejo, solo si el nuevo salió bien y es el mismo chat
    if (oldMessageId && oldMessageId !== newMsg.message_id) {
      await ctx.api.deleteMessage(chatId, oldMessageId).catch(() => {});
    }
  } catch (err: any) {
    if (parseMode === 'HTML' && err?.message?.includes("can't parse entities")) {
      try {
        const plainText = truncateForTelegram(text.replace(/<[^>]*>/g, ''));
        const fallbackMsg = await ctx.reply(plainText, {
          reply_markup: replyMarkup as any,
        });
        session.uiMessageId = fallbackMsg.message_id;

        if (oldMessageId) {
          await ctx.api.deleteMessage(chatId, oldMessageId).catch(() => {});
        }
      } catch (innerErr) {
        // Fallback falló silenciosamente
      }
    }
  }
}

/**
 * Helper para agregar un botón "Volver" genérico
 */
export function addBackButton(kb: InlineKeyboard, action: string, text = '⬅️ Volver') {
  return kb.row().text(text, action);
}
