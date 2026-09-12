import { Prisma } from '@/generated/prisma/client';
import { GiftcardIssueType, GiftcardStatus } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { decryptBuffer } from '@/lib/encryption';
import { downloadTelegramFileAsBase64 } from '@/lib/services/telegram/telegram-file';
import type { ReportIssueParams } from '@/types';

/**
 * Reports an issue with a gift card. Creates the issue and updates card status.
 * Deletes any existing issue for the same card/order/user first (allows re-reporting).
 * Only allowed on PENDING orders — confirmed/completed orders cannot be modified.
 */
export async function reportGiftcardIssue(params: ReportIssueParams) {
  const { giftcardId, orderId, userId, issueType, reportedAmount, proofImageUrl, proofData, proofMimeType } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true },
  });
  if (!order) {
    logger.warn('reportGiftcardIssue: orden no encontrada', { flow: 'order', action: 'report-issue', userId, metadata: { orderId } });
    throw new Error('Orden no encontrada');
  }
  if (order.userId !== userId) {
    logger.warn('reportGiftcardIssue: la orden no pertenece al usuario', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { orderId },
    });
    throw new Error('No autorizado');
  }
  if (order.status !== 'PENDING') {
    logger.warn('reportGiftcardIssue: orden no está pendiente', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { orderId, status: order.status },
    });
    throw new Error('No se pueden reportar problemas en una orden que ya fue confirmada');
  }

  const card = await prisma.giftcard.findUnique({
    where: { id: giftcardId },
    select: { ownerId: true, orderId: true, amount: true },
  });

  if (!card) {
    logger.warn('reportGiftcardIssue: giftcard no encontrada', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { giftcardId, orderId },
    });
    throw new Error('Giftcard not found');
  }
  if (card.orderId !== orderId) {
    logger.warn('reportGiftcardIssue: tarjeta no pertenece a la orden', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { giftcardId, orderId, cardOrderId: card.orderId },
    });
    throw new Error('La tarjeta no pertenece a esta orden');
  }

  // El monto reportado es el saldo REAL de la tarjeta y alimenta DIRECTO el
  // adjustedTotal del buyer, el payout del seller y el profit del admin
  // (computeEffectiveTotal/computeFaceValueTotal — las 3 patas ya computan sobre
  // reportedAmount consistentemente). Regla de negocio (sept 2026): el saldo real
  // puede ser MAYOR o menor al valor facial declarado (seller under/over-declared)
  // — NO hay bound superior. Solo se rechaza nulo o <= 0.
  if (issueType === 'WRONG_AMOUNT') {
    const reported = reportedAmount != null ? new Prisma.Decimal(reportedAmount) : null;
    if (!reported || reported.lte(0)) {
      logger.warn('reportGiftcardIssue: monto reportado inválido', {
        flow: 'order',
        action: 'report-issue',
        userId,
        metadata: { giftcardId, orderId, reportedAmount, cardAmount: card.amount.toString() },
      });
      throw new Error('El monto reportado debe ser mayor a 0');
    }
  }

  return prisma.$transaction(async (tx) => {
    // Guard atómico DENTRO de la tx: lockea la fila de la orden y re-valida el
    // status. Si otro canal confirmó/canceló la orden entre el pre-check y este
    // punto (race cross-canal web/bot), el update no matchea → P2025 → error
    // amigable, y nunca se escribe un reporte sobre una orden ya confirmada.
    try {
      await tx.order.update({
        where: { id: orderId, status: 'PENDING' },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        logger.warn('reportGiftcardIssue: orden dejó de estar pendiente durante la tx (race cross-canal)', {
          flow: 'order',
          action: 'report-issue',
          userId,
          metadata: { orderId },
        });
        throw new Error('No se pueden reportar problemas en una orden que ya fue confirmada');
      }
      throw err;
    }

    await tx.giftcardIssue.deleteMany({
      where: { giftcardId, orderId, reportedById: userId },
    });

    const issue = await tx.giftcardIssue.create({
      data: {
        issueType: issueType as GiftcardIssueType,
        reportedAmount: reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
        proofImageUrl,
        proofData,
        proofMimeType,
        giftcardId,
        orderId,
        reportedById: userId,
        sellerId: card.ownerId ?? undefined,
      },
    });

    await tx.giftcard.update({
      where: { id: giftcardId },
      data: {
        status: issueType as GiftcardStatus,
        reportedAmount: issueType === 'WRONG_AMOUNT' && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
      },
    });

    return issue;
  });
}

/**
 * Attaches (or replaces) the proof screenshot of an EXISTING issue.
 * Intentionally NOT restricted to PENDING orders: the provider usually asks
 * for evidence AFTER the order was confirmed/paid, so late attach from the
 * buyer's order history must work in any order status.
 */
export async function attachIssueProof(params: { issueId: string; userId: string; proofData: Uint8Array<ArrayBuffer>; proofMimeType: string }) {
  const { issueId, userId, proofData, proofMimeType } = params;

  const issue = await prisma.giftcardIssue.findUnique({
    where: { id: issueId },
    select: { id: true, reportedById: true },
  });

  if (!issue) {
    logger.warn('attachIssueProof: issue no encontrado', {
      flow: 'order',
      action: 'attach-issue-proof',
      userId,
      metadata: { issueId },
    });
    throw new Error('Reporte no encontrado');
  }
  if (issue.reportedById !== userId) {
    logger.warn('attachIssueProof: el reporte no pertenece al usuario', {
      flow: 'order',
      action: 'attach-issue-proof',
      userId,
      metadata: { issueId },
    });
    throw new Error('No autorizado');
  }

  await prisma.giftcardIssue.update({
    where: { id: issueId },
    data: { proofData, proofMimeType },
  });
}

/**
 * Resolves an issue's proof screenshot. Dual source:
 * - Web uploads: `proofData` (AES-256-GCM encrypted bytes) → decryptBuffer.
 * - Bot uploads: `proofImageUrl` is a Telegram file_id, resolved through the
 *   Bot API with BUYER_BOT_TOKEN.
 * Returns null when there is no proof or it cannot be resolved. NO ownership
 * check here — the caller (admin/buyer action) enforces authorization.
 */
export async function getIssueProofData(issueId: string): Promise<{ mimeType: string; base64: string } | null> {
  const issue = await prisma.giftcardIssue.findUnique({
    where: { id: issueId },
    select: { proofImageUrl: true, proofData: true, proofMimeType: true },
  });

  if (!issue?.proofData && !issue?.proofImageUrl) return null;

  // Web proof wins when both exist (a late web attach replaces a bot proof)
  if (issue.proofData) {
    try {
      const decrypted = decryptBuffer(Buffer.from(issue.proofData));
      return { mimeType: issue.proofMimeType || 'image/jpeg', base64: decrypted.toString('base64') };
    } catch {
      return null;
    }
  }

  const botToken = process.env.BUYER_BOT_TOKEN;
  if (!botToken) return null;

  const downloaded = await downloadTelegramFileAsBase64(botToken, issue.proofImageUrl!);
  if (!downloaded) return null;

  const mimeType = downloaded.filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { mimeType, base64: downloaded.base64 };
}

/**
 * Deletes all issues for a giftcard/order/user and resets card status to UNUSED if no remaining issues.
 * Only allowed on PENDING orders.
 */
export async function deleteGiftcardIssue(giftcardId: string, orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true },
  });
  if (!order) {
    logger.warn('deleteGiftcardIssue: orden no encontrada', { flow: 'order', action: 'delete-issue', userId, metadata: { orderId } });
    throw new Error('Orden no encontrada');
  }
  if (order.userId !== userId) {
    logger.warn('deleteGiftcardIssue: la orden no pertenece al usuario', {
      flow: 'order',
      action: 'delete-issue',
      userId,
      metadata: { orderId },
    });
    throw new Error('No autorizado');
  }
  if (order.status !== 'PENDING') {
    logger.warn('deleteGiftcardIssue: orden no está pendiente', {
      flow: 'order',
      action: 'delete-issue',
      userId,
      metadata: { orderId, status: order.status },
    });
    throw new Error('No se pueden modificar reportes en una orden que ya fue confirmada');
  }

  return prisma.$transaction(async (tx) => {
    // Guard atómico DENTRO de la tx (mismo patrón que reportGiftcardIssue):
    // lockea la fila y re-valida status — evita resetear una card a UNUSED en
    // una orden que otro canal acaba de confirmar (race cross-canal web/bot).
    try {
      await tx.order.update({
        where: { id: orderId, status: 'PENDING' },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        logger.warn('deleteGiftcardIssue: orden dejó de estar pendiente durante la tx (race cross-canal)', {
          flow: 'order',
          action: 'delete-issue',
          userId,
          metadata: { orderId },
        });
        throw new Error('No se pueden modificar reportes en una orden que ya fue confirmada');
      }
      throw err;
    }

    await tx.giftcardIssue.deleteMany({
      where: { giftcardId, orderId, reportedById: userId },
    });

    const remaining = await tx.giftcardIssue.findFirst({ where: { giftcardId } });
    if (!remaining) {
      await tx.giftcard.update({
        where: { id: giftcardId },
        data: { status: 'UNUSED', reportedAmount: null },
      });
    }
  });
}

/**
 * Updates the reportedAmount of an existing issue (admin correction) — syncs
 * BOTH the issue row and the card (reportedAmount feeds adjustedTotal, payout
 * y profit). Misma guarda anti-race que reportGiftcardIssue: re-valida el
 * status de la orden DENTRO de la tx (P2025 si otro canal la transicionó).
 */
export async function updateGiftcardIssueAmount(
  giftcardId: string,
  orderId: string,
  userId: string,
  reportedAmount: number,
) {
  const reported = new Prisma.Decimal(reportedAmount);
  if (reported.lte(0)) {
    throw new Error('El monto reportado debe ser mayor a 0');
  }

  const card = await prisma.giftcard.findUnique({
    where: { id: giftcardId },
    select: { orderId: true },
  });
  if (!card) throw new Error('Giftcard not found');
  if (card.orderId !== orderId) throw new Error('La tarjeta no pertenece a esta orden');

  return prisma.$transaction(async (tx) => {
    // Guard atómico DENTRO de la tx (patrón anti-race cross-canal)
    try {
      await tx.order.update({
        where: { id: orderId, status: 'PENDING' },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        logger.warn('updateGiftcardIssueAmount: orden dejó de estar pendiente durante la tx (race cross-canal)', {
          flow: 'order',
          action: 'update-issue-amount',
          userId,
          metadata: { orderId },
        });
        throw new Error('No se pueden modificar reportes de una orden que ya fue confirmada');
      }
      throw err;
    }

    await tx.giftcardIssue.updateMany({
      where: { giftcardId, orderId },
      data: { reportedAmount: reported },
    });

    await tx.giftcard.update({
      where: { id: giftcardId },
      data: { reportedAmount: reported },
    });
  });
}
