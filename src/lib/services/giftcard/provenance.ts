import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { decryptBuffer } from '@/lib/encryption';
import { downloadTelegramFileAsBase64 } from '@/lib/services/telegram/telegram-file';

export interface AttachProvenanceImageParams {
  giftcardId: string;
  /** Seller que adjunta — debe ser el owner de la card. */
  userId: string;
  /** Buffer ya comprimido y cifrado (AES-256-GCM) — la action lo prepara. */
  data: Uint8Array<ArrayBuffer>;
  mimeType: string;
  /** Tamaño del buffer comprimido (pre-cifrado), para auditoría. */
  size: number;
}

/**
 * Adjunta (o reemplaza) la imagen de procedencia de una card desde el
 * historial de lotes del seller. Espejo de attachIssueProof del buyer: sin
 * guarda de estado del batch (la evidencia puede hacer falta post-pago en una
 * disputa) y re-adjuntar = reemplazar.
 *
 * Una card tiene UNA imagen de procedencia: las viejas se borran en la misma
 * tx. Se setean AMBOS links — `ProvenanceImage.giftcardId` (el que lee la
 * galería admin via getBatchImages) y `Giftcard.provenanceImageId` (el FK que
 * mantiene linkImageToCard) — para que todas las lecturas la vean.
 */
export async function attachProvenanceImage({ giftcardId, userId, data, mimeType, size }: AttachProvenanceImageParams) {
  const card = await prisma.giftcard.findUnique({
    where: { id: giftcardId },
    select: { id: true, ownerId: true, batchId: true },
  });

  if (!card) {
    logger.warn('attachProvenanceImage: card no encontrada', {
      flow: 'sell',
      action: 'attach-provenance-image',
      userId,
      metadata: { giftcardId },
    });
    throw new Error('Card not found');
  }

  if (card.ownerId !== userId) {
    logger.warn('attachProvenanceImage: el seller no es el owner de la card', {
      flow: 'sell',
      action: 'attach-provenance-image',
      userId,
      metadata: { giftcardId, ownerId: card.ownerId },
    });
    throw new Error('This card does not belong to you');
  }

  if (card.batchId === null) {
    logger.warn('attachProvenanceImage: card sin batch', {
      flow: 'sell',
      action: 'attach-provenance-image',
      userId,
      metadata: { giftcardId },
    });
    throw new Error('Card is not part of a batch');
  }

  await prisma.$transaction(async (tx) => {
    // Reemplazo: las imágenes previas de la card mueren con la misma tx
    // (los bytes cifrados viven en la fila — no hay storage externo que limpiar).
    await tx.provenanceImage.deleteMany({ where: { giftcardId: card.id } });

    const image = await tx.provenanceImage.create({
      data: {
        data,
        mimeType,
        size,
        giftcardId: card.id,
        batchId: card.batchId!.toString(),
      },
      select: { id: true },
    });

    await tx.giftcard.update({
      where: { id: card.id },
      data: { provenanceImageId: image.id },
    });
  });

  logger.action('sell', 'attach-provenance-image', `Imagen de procedencia adjuntada a card ${giftcardId}`, {
    userId,
    metadata: { giftcardId, batchId: card.batchId, size },
  });
}

/**
 * Resolves the provenance image of ONE card. Dual source (same order as the
 * admin batch gallery):
 * - Bot uploads: `telegramFileId` → Bot API with SELLER_BOT_TOKEN.
 * - Web uploads: `data` (AES-256-GCM encrypted bytes) → decryptBuffer.
 * Returns null when there is no image or it cannot be resolved. NO ownership
 * check here — the caller (seller/admin action) enforces authorization.
 */
export async function getProvenanceImageData(giftcardId: string): Promise<{ mimeType: string; base64: string } | null> {
  const image = await prisma.provenanceImage.findFirst({
    where: { giftcardId },
    select: { mimeType: true, data: true, telegramFileId: true },
  });
  if (!image) return null;

  if (image.telegramFileId) {
    const botToken = process.env.SELLER_BOT_TOKEN;
    if (!botToken) return null;
    const downloaded = await downloadTelegramFileAsBase64(botToken, image.telegramFileId);
    if (!downloaded) return null;
    return { mimeType: image.mimeType || 'image/jpeg', base64: downloaded.base64 };
  }

  if (!image.data) return null;
  try {
    const decrypted = decryptBuffer(Buffer.from(image.data));
    return { mimeType: image.mimeType || 'image/jpeg', base64: decrypted.toString('base64') };
  } catch {
    return null;
  }
}
