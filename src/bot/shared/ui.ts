import { InlineKeyboard } from 'grammy';
import type { SellerContext, BuyerContext } from './types.js';

type BotContext = SellerContext | BuyerContext;

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
  },
): Promise<void> {
  const session = ctx.session;
  const parseMode = options?.parse_mode || 'HTML';
  const replyMarkup = options?.reply_markup;

  // Responder callback queries siempre
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery().catch(() => {});
  }

  // Intentar editar si existe un ID y no se fuerza uno nuevo
  if (!options?.forceNew && session.uiMessageId) {
    try {
      await ctx.api.editMessageText(ctx.chat!.id, session.uiMessageId, text, {
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
      console.warn(`[UI] editMessageText falló (ID: ${session.uiMessageId}):`, err.message);
      session.uiMessageId = undefined;
    }
  }

  // Enviar mensaje nuevo
  const oldMessageId = session.uiMessageId;
  try {
    const newMsg = await ctx.reply(text, {
      parse_mode: parseMode,
      reply_markup: replyMarkup as any,
    });

    session.uiMessageId = newMsg.message_id;

    // AHORA borramos el viejo, solo si el nuevo salió bien
    if (oldMessageId) {
      await ctx.api.deleteMessage(ctx.chat!.id, oldMessageId).catch(() => {});
    }
  } catch (err: any) {
    console.error(`[UI] Error crítico al enviar mensaje:`, err.message);

    if (parseMode === 'HTML' && err?.message?.includes("can't parse entities")) {
      try {
        const plainText = text.replace(/<[^>]*>/g, '');
        const fallbackMsg = await ctx.reply(plainText, {
          reply_markup: replyMarkup as any,
        });
        session.uiMessageId = fallbackMsg.message_id;

        if (oldMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, oldMessageId).catch(() => {});
        }
      } catch (innerErr) {
        console.error(`[UI] Fallback total falló:`, innerErr);
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
