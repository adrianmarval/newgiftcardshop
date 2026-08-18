import type { Api } from 'grammy';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const NOTIFICATIONS_TOPIC_NAME = '🔔 Notificaciones';
export const FLOW_TOPIC_NAME = '🤖 Menú';

type TopicField = 'notificationTopicId' | 'flowTopicId';
type ChatField = 'notificationChatId' | 'flowChatId';

const CHAT_FIELD: Record<TopicField, ChatField> = {
  notificationTopicId: 'notificationChatId',
  flowTopicId: 'flowChatId',
};

/**
 * INVARIANTE: los message_thread_id son por (bot, chat). Un topic id persistido
 * solo es válido si el chatId persistido coincide con el chat actual.
 * Esto protege contra: cambio de rol (buyer-bot ↔ seller-bot), ADMIN en ambos
 * bots, y cualquier bot futuro.
 */

/** true si el error de Telegram indica que el topic fue borrado o está cerrado. */
export function isTopicGoneError(errorMessage: string): boolean {
  return /thread not found|topic closed/i.test(errorMessage);
}

/** Intenta reabrir un topic cerrado por el usuario. Retorna true si quedó abierto. */
export async function tryReopenTopic(api: Api, chatId: number, topicId: number): Promise<boolean> {
  try {
    await api.reopenForumTopic(chatId, topicId);
    return true;
  } catch {
    return false;
  }
}

// ── Cache en memoria: chats donde topic mode está apagado ────────────────────
// Si createForumTopic falla (bot sin topic mode en BotFather), se marca el chat
// por 1h para no spamear la API ni los logs en cada mensaje. El TTL permite
// recuperación automática si el admin habilita topic mode.
const unsupportedTopicMode = new Map<string, number>();
const UNSUPPORTED_TTL_MS = 60 * 60 * 1000;

function isTopicModeUnsupported(chatId: number): boolean {
  const ts = unsupportedTopicMode.get(String(chatId));
  if (ts == null) return false;
  if (Date.now() - ts > UNSUPPORTED_TTL_MS) {
    unsupportedTopicMode.delete(String(chatId));
    return false;
  }
  return true;
}

/**
 * Crea un topic en el chat privado del usuario con el bot
 * (forum topic mode en chats privados, Bot API 10.x).
 * Retorna el message_thread_id o null si falla (ej: bot sin topic mode).
 */
export async function createTopic(api: Api, chatId: number, name: string): Promise<number | null> {
  try {
    const topic = await api.createForumTopic(chatId, name);
    return topic.message_thread_id;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn(`[Notifications] No se pudo crear el topic "${name}" en chat ${chatId} (¿topic mode habilitado en BotFather?): ${errorMessage}`);
    return null;
  }
}

/**
 * Persiste un topic id (y su chatId) en TelegramUser (best-effort, nunca lanza).
 * Con topicId null limpia ambos campos.
 */
export async function persistTopicId(userId: string, field: TopicField, topicId: number | null, chatId?: number): Promise<void> {
  const chatField = CHAT_FIELD[field];
  await prisma.telegramUser
    .update({
      where: { userId },
      data: {
        [field]: topicId,
        [chatField]: topicId != null && chatId != null ? String(chatId) : null,
      },
    })
    .catch((err) => {
      logger.warn(`[Notifications] No se pudo persistir ${field} para user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    });
}

interface GetOrCreateTopicParams {
  api: Api;
  chatId: number;
  name: string;
  field: TopicField;
  /** Si está presente, el resultado se persiste en TelegramUser con claim atómico. */
  userId?: string;
  storedTopicId?: number | null;
  storedChatId?: string | null;
}

/**
 * Retorna el message_thread_id del topic `name` en el chat indicado, creándolo
 * lazy si no existe. Retorna null si el bot no tiene topic mode (el caller hace
 * fallback a mensaje plano).
 *
 * Anti-duplicados: la persistencia usa un claim atómico (updateMany where field
 * is null). Si dos procesos crean el topic concurrentemente, el que pierde el
 * claim borra su topic huérfano y adopta el del ganador.
 */
export async function getOrCreateTopicId(params: GetOrCreateTopicParams): Promise<number | null> {
  const { api, chatId, name, field, userId, storedTopicId, storedChatId } = params;
  const chatIdStr = String(chatId);

  // Un topic id solo es válido en el chat donde fue creado.
  // storedChatId null = fila legacy (pre-chatId) → se adopta y se backfillea;
  // si era de otro chat, el primer envío falla con thread not found y se recrea.
  if (storedTopicId != null && (storedChatId == null || storedChatId === chatIdStr)) {
    if (storedChatId == null && userId) {
      void persistTopicId(userId, field, storedTopicId, chatId);
    }
    return storedTopicId;
  }

  if (isTopicModeUnsupported(chatId)) return null;

  const topicId = await createTopic(api, chatId, name);
  if (topicId == null) {
    unsupportedTopicMode.set(chatIdStr, Date.now());
    return null;
  }
  if (!userId) return topicId;

  // Claim atómico: gana quien escribe primero; cubre concurrencia in-process
  // (Promise.all en dispatch) y multi-instancia (locks en memoria no bastan)
  const chatField = CHAT_FIELD[field];
  const claimed = await prisma.telegramUser
    .updateMany({
      where: { userId, OR: [{ [field]: null }, { [chatField]: { not: chatIdStr } }] },
      data: { [field]: topicId, [chatField]: chatIdStr },
    })
    .catch((err) => {
      logger.warn(`[Notifications] No se pudo claimear ${field} para user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
      return { count: 0 };
    });

  if (claimed.count > 0) return topicId;

  // Perdimos la carrera (o la fila no existe): si hay un ganador válido en este
  // chat, borrar el topic huérfano que creamos y adoptar el del ganador
  const winner = await prisma.telegramUser
    .findUnique({ where: { userId } })
    .catch(() => null);
  const winnerTopicId = winner?.[field] as number | null;
  const winnerChatId = winner?.[chatField] as string | null;

  if (winnerTopicId != null && winnerChatId === chatIdStr && winnerTopicId !== topicId) {
    // Retry delete del topic huérfano — no silenciar errores como antes
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await api.deleteForumTopic(chatId, topicId);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[Topics] Error borrando topic huérfano ${topicId} en chat ${chatId} (intento ${attempt + 1}): ${msg}`);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
      }
    }
    return winnerTopicId;
  }

  // Sin ganador válido (ej: fila inexistente) → conservar el topic creado
  return topicId;
}

/**
 * Limpia el topic de notificaciones persistido (ej: el usuario borró el topic)
 * para que se recree en el próximo envío.
 */
export async function resetNotificationTopicId(userId: string): Promise<void> {
  await persistTopicId(userId, 'notificationTopicId', null);
}

/**
 * Limpia el topic de flujo ("🤖 Menú") persistido (ej: el usuario borró el topic)
 * para que se recree en el próximo envío.
 */
export async function resetFlowTopicId(userId: string): Promise<void> {
  await persistTopicId(userId, 'flowTopicId', null);
}
