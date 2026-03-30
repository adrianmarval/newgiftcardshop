"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DisputeStatus } from "@/generated/prisma/client";
import type { DisputeType } from "@/types";

/**
 * Inicia una disputa para una orden
 * @param orderId - ID de la orden
 * @param disputeType - OVERPAID (buyer pagó de más) o UNDERPAID (buyer pagó de menos)
 * @param reason - Descripción del problema
 * @param difference - Diferencia entre el monto confirmado y el real
 */
export async function createDispute(
  orderId: string,
  disputeType: DisputeType,
  reason: string,
  difference: number
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Verificar que la orden existe y el usuario tiene permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: true,
        user: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Solo el buyer o admin pueden crear disputas
    const isAdmin = session.user.role?.includes("ADMIN");
    const isBuyer = order.userId === session.user.id;

    if (!isAdmin && !isBuyer) {
      throw new Error("Not authorized to create dispute for this order");
    }

    // Crear la disputa
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        disputeStatus: DisputeStatus.PENDING,
        disputeType,
        disputeReason: reason,
        disputeDifference: difference,
      },
    });

    return { success: true, orderId: updatedOrder.id };
  } catch (error) {
    console.error("Error creating dispute:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create dispute" };
  }
}

/**
 * Resuelve una disputa según el escenario
 * @param orderId - ID de la orden
 * @param resolution - ACCEPTED o REJECTED
 * @param notes - Notas de resolución
 */
export async function resolveDispute(
  orderId: string,
  resolution: "ACCEPTED" | "REJECTED",
  notes?: string
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Solo admin puede resolver disputas
    const isAdmin = session.user.role?.includes("ADMIN");
    if (!isAdmin) {
      throw new Error("Only admin can resolve disputes");
    }

    // Obtener la orden con sus datos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: true,
        user: true,
        payments: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.disputeStatus !== "PENDING") {
      throw new Error("Dispute is not in pending status");
    }

    // Resolver la disputa
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        disputeStatus: resolution,
        disputeResolvedAt: new Date(),
        disputeNotes: notes,
      },
    });

    // TODO: Aquí iría la lógica de reembolsos según el escenario
    // Esto dependerá de cómo esté implementado el sistema de pagos
    // Por ahora solo marcamos la disputa como resuelta

    return { 
      success: true, 
      orderId: updatedOrder.id,
      resolution,
      message: resolution === "ACCEPTED" 
        ? getResolutionMessage(order.disputeType!, order.status, order.payments.length > 0)
        : "Dispute rejected"
    };
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to resolve dispute" };
  }
}

/**
 * Obtiene las órdenes con disputas pendientes
 */
export async function getPendingDisputes() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const isAdmin = session.user.role?.includes("ADMIN");

    if (!isAdmin) {
      throw new Error("Only admin can view all disputes");
    }

    const orders = await prisma.order.findMany({
      where: {
        disputeStatus: DisputeStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        giftcards: {
          select: {
            id: true,
            amount: true,
            reportedAmount: true,
            brand: {
              select: {
                name: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return orders.map(order => ({
      ...order,
      total: Number(order.total),
      confirmedTotal: order.confirmedTotal ? Number(order.confirmedTotal) : null,
      disputeDifference: order.disputeDifference ? Number(order.disputeDifference) : null,
      giftcards: order.giftcards.map(card => ({
        ...card,
        amount: Number(card.amount),
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
      })),
    }));
  } catch (error) {
    console.error("Error fetching pending disputes:", error);
    return [];
  }
}

/**
 * Obtiene los detalles de una disputa específica
 */
export async function getDisputeDetails(orderId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        giftcards: {
          include: {
            brand: true,
            country: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verificar permisos
    const isAdmin = session.user.role?.includes("ADMIN");
    const isBuyer = order.userId === session.user.id;

    if (!isAdmin && !isBuyer) {
      throw new Error("Not authorized to view this dispute");
    }

    return {
      ...order,
      total: Number(order.total),
      confirmedTotal: order.confirmedTotal ? Number(order.confirmedTotal) : null,
      disputeDifference: order.disputeDifference ? Number(order.disputeDifference) : null,
      disputeResolvedAt: order.disputeResolvedAt?.toISOString() || null,
      giftcards: order.giftcards.map(card => ({
        ...card,
        amount: Number(card.amount),
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
        price: Number(card.price),
      })),
      payments: order.payments.map(p => ({
        ...p,
        amount: Number(p.amount),
        balanceAfter: Number(p.balanceAfter),
      })),
    };
  } catch (error) {
    console.error("Error fetching dispute details:", error);
    return null;
  }
}

/**
 * Cancela una disputa (la vuelve al estado NONE)
 */
export async function cancelDispute(orderId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Solo el buyer que creó la disputa o admin pueden cancelarla
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const isAdmin = session.user.role?.includes("ADMIN");
    const isBuyer = order.userId === session.user.id;

    if (!isAdmin && !isBuyer) {
      throw new Error("Not authorized to cancel this dispute");
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        disputeStatus: DisputeStatus.NONE,
        disputeType: null,
        disputeReason: null,
        disputeDifference: null,
        disputeResolvedAt: null,
        disputeNotes: null,
      },
    });

    return { success: true, orderId: updatedOrder.id };
  } catch (error) {
    console.error("Error cancelling dispute:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to cancel dispute" };
  }
}

// Helper para el mensaje de resolución según el escenario
function getResolutionMessage(
  disputeType: DisputeType | null, 
  orderStatus: string, 
  isPaid: boolean
): string {
  if (!disputeType) return "Dispute resolved";

  const isCompleted = orderStatus === "COMPLETED";

  if (disputeType === "OVERPAID") {
    if (!isCompleted) {
      // Escenario 1: Mayor confirmado, NO pagado
      return "Seller must refund the difference to admin";
    } else {
      // Escenario 2: Mayor confirmado, SÍ pagado  
      return "Seller refunds to admin, then admin refunds to buyer";
    }
  } else {
    // UNDERPAID
    if (!isCompleted) {
      // Escenario 3: Menor confirmado, NO pagado
      return "Order confirmation cancelled. Buyer must re-confirm with correct amount";
    } else {
      // Escenario 4: Menor confirmado, SÍ pagado
      return "Buyer refunds difference to admin, then admin pays seller";
    }
  }
}

/**
 * Reporta el monto real de tarjetas y detecta automáticamente si hay disputas
 * @param orderId - ID de la orden
 * @param cardReports - Array de { cardId, reportedAmount } con los montos reportados por el buyer
 */
export async function reportCardAmounts(
  orderId: string,
  cardReports: { cardId: string; reportedAmount: number }[]
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Verificar que la orden pertenece al buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== session.user.id) {
      throw new Error("Not authorized to report on this order");
    }

    // Actualizar los montos reportados y estados de cada tarjeta
    for (const report of cardReports) {
      await prisma.giftcard.update({
        where: { id: report.cardId },
        data: {
          reportedAmount: report.reportedAmount,
          // Si el monto reportado es 0 o es inválido, marcar como usada/inválida
          ...(report.reportedAmount === 0 && { status: "INVALID" }),
        },
      });
    }

    // Recalcular el total real basado en:
    // - Tarjetas con reportedAmount: usar ese monto
    // - Tarjetasmarked as INVALID/ALREADY_USED/DEACTIVATED: valor 0
    // - Otras tarjetas: monto original
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: true,
      },
    });

    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    const realTotal = updatedOrder.giftcards.reduce((sum, card) => {
      // Si la tarjeta fue marcada como inválida, no cuenta
      if (card.status === "INVALID" || card.status === "ALREADY_USED" || card.status === "DEACTIVATED") {
        return sum;
      }
      // Si hay un reportedAmount, usarlo
      if (card.reportedAmount !== null) {
        return sum + card.reportedAmount.toNumber();
      }
      // Usar el monto original
      return sum + card.amount.toNumber();
    }, 0);

    const confirmedTotal = order.confirmedTotal?.toNumber() || 0;
    const difference = realTotal - confirmedTotal;

    // Si ya hay una disputa activa, actualizarla
    if (order.disputeStatus === "PENDING") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          disputeDifference: difference,
        },
      });

      return {
        success: true,
        orderId,
        hasDispute: true,
        difference,
        realTotal,
        confirmedTotal,
        message: "Dispute updated with new amounts",
      };
    }

    // Si no hay disputa pero hay diferencia, crear una automáticamente
    if (Math.abs(difference) > 0.01) { // Tolerancia de 1 centavo
      const disputeType = difference > 0 ? "UNDERPAID" : "OVERPAID";
      
      await prisma.order.update({
        where: { id: orderId },
        data: {
          disputeStatus: DisputeStatus.PENDING,
          disputeType,
          disputeReason: `Discrepancy detected: cards reported with different amounts than initially confirmed`,
          disputeDifference: difference,
        },
      });

      return {
        success: true,
        orderId,
        hasDispute: true,
        disputeType,
        difference,
        realTotal,
        confirmedTotal,
        message: disputeType === "OVERPAID" 
          ? "Dispute created: buyer paid more than the actual card values"
          : "Dispute created: buyer paid less than the actual card values",
      };
    }

    return {
      success: true,
      orderId,
      hasDispute: false,
      difference: 0,
      realTotal,
      confirmedTotal,
      message: "All amounts verified correctly",
    };
  } catch (error) {
    console.error("Error reporting card amounts:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to report card amounts" 
    };
  }
}

/**
 * Obtiene las discrepancias de una orden sin crear una disputa
 * Útil para mostrar预览 al buyer antes de confirmar
 */
export async function checkOrderDiscrepancies(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Calcular el total basado en montos reportados (si existen) o montos originales
    const realTotal = order.giftcards.reduce((sum, card) => {
      return sum + (card.reportedAmount?.toNumber() || card.amount.toNumber());
    }, 0);

    const confirmedTotal = order.confirmedTotal?.toNumber() || 0;
    const difference = realTotal - confirmedTotal;

    // Calcular discrepancia por tarjeta
    const cardDiscrepancies = order.giftcards.map((card) => ({
      cardId: card.id,
      originalAmount: card.amount.toNumber(),
      reportedAmount: card.reportedAmount?.toNumber() || null,
      hasDiscrepancy: card.reportedAmount && card.reportedAmount.toNumber() !== card.amount.toNumber(),
      difference: card.reportedAmount 
        ? card.reportedAmount.toNumber() - card.amount.toNumber()
        : 0,
    }));

    return {
      success: true,
      hasDiscrepancy: Math.abs(difference) > 0.01,
      difference,
      originalTotal: order.total.toNumber(),
      confirmedTotal,
      realTotal,
      disputeType: difference > 0 ? "UNDERPAID" : difference < 0 ? "OVERPAID" : null,
      cardDiscrepancies,
    };
  } catch (error) {
    console.error("Error checking discrepancies:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to check discrepancies" 
    };
  }
}

/**
 * El seller responde a una disputa (acepta o rechaza)
 * @param orderId - ID de la orden
 * @param response - ACCEPT o REJECT
  * @param evidence - Evidencia o motivo del rechazo (opcional)
  */
export async function sellerResponseToDispute(
  orderId: string,
  response: "ACCEPT" | "REJECT",
  evidence?: string
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Obtener los batches del seller
    const sellerBatches = await prisma.giftcardBatch.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const batchIds = sellerBatches.map((b) => b.id);

    // Construir condición: buscar por batchId O por ownerId
    const giftcardCondition = batchIds.length > 0
      ? {
          OR: [
            { batchId: { in: batchIds } },
            { ownerId: session.user.id },
          ],
        }
      : { ownerId: session.user.id };

    // Verificar que el usuario es seller y tiene tarjetas en esta orden
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: {
          where: giftcardCondition,
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.giftcards.length === 0) {
      throw new Error("You don't have any cards in this order");
    }

    if (order.disputeStatus !== "PENDING") {
      throw new Error("Dispute is not in pending status");
    }

    // Actualizar la disputa según la respuesta del seller
    const updateData: any = {
      disputeNotes: response === "ACCEPT" 
        ? `Seller accepted the dispute. ${evidence || ""}`
        : `Seller rejected the dispute. Reason: ${evidence || "No reason provided"}`,
    };

    // Si el seller acepta, la disputapasa a ACCEPTED (o podría pasar a RESOLVED directamente)
    // Si rechaza, queda PENDING para que el admin resuelva
    if (response === "ACCEPT") {
      updateData.disputeStatus = DisputeStatus.ACCEPTED;
      updateData.disputeResolvedAt = new Date();
    }

    await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return {
      success: true,
      orderId,
      response,
      message: response === "ACCEPT" 
        ? "Dispute accepted. The system will process the refund."
        : "Dispute rejected. An admin will review the case.",
    };
  } catch (error) {
    console.error("Error responding to dispute:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to respond to dispute",
    };
  }
}

/**
 * Obtiene las disputas para el seller (órdenes que tienen sus tarjetas)
 */
export async function getSellerDisputes() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    // Obtener IDs de órdenes que tienen tarjetas del seller (a través del batch)
    const sellerBatches = await prisma.giftcardBatch.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const batchIds = sellerBatches.map((b) => b.id);

    // Construir condición de búsqueda: buscar por batchId O por ownerId
    // Esto cubre ambos casos: si las tarjetas tienen batch o tienen owner directo
    const giftcardCondition = batchIds.length > 0
      ? {
          OR: [
            { batchId: { in: batchIds } },
            { ownerId: session.user.id },
          ],
        }
      : { ownerId: session.user.id };

    // Buscar tarjetas que pertenezcan a estos batches y tengan orden
    const sellerGiftcards = await prisma.giftcard.findMany({
      where: {
        batchId: {
          in: batchIds,
        },
        orderId: {
          not: null,
        },
      },
      select: {
        orderId: true,
      },
    });

    const orderIds = [...new Set(sellerGiftcards.map((g) => g.orderId).filter(Boolean))] as string[];

    // Construir condición para filtrar las tarjetas del seller
    const sellerGiftcardCondition = batchIds.length > 0
      ? {
          OR: [
            { batchId: { in: batchIds } },
            { ownerId: session.user.id },
          ],
        }
      : { ownerId: session.user.id };

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        disputeStatus: {
          not: DisputeStatus.NONE,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        giftcards: {
          where: sellerGiftcardCondition,
          include: {
            brand: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return orders.map((order) => ({
      ...order,
      total: Number(order.total),
      confirmedTotal: order.confirmedTotal ? Number(order.confirmedTotal) : null,
      disputeDifference: order.disputeDifference ? Number(order.disputeDifference) : null,
      disputeResolvedAt: order.disputeResolvedAt?.toISOString() || null,
      giftcards: order.giftcards.map((card) => ({
        ...card,
        amount: Number(card.amount),
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
      })),
    }));
  } catch (error) {
    console.error("Error fetching seller disputes:", error);
    return [];
  }
}

/**
 * Obtiene todas las disputas (para admin ver completo)
 */
export async function getAllDisputes() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const isAdmin = session.user.role?.includes("ADMIN");
    if (!isAdmin) {
      throw new Error("Only admin can view all disputes");
    }

    const orders = await prisma.order.findMany({
      where: {
        disputeStatus: {
          not: DisputeStatus.NONE,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        giftcards: {
          include: {
            brand: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return orders.map((order) => ({
      ...order,
      total: Number(order.total),
      confirmedTotal: order.confirmedTotal ? Number(order.confirmedTotal) : null,
      disputeDifference: order.disputeDifference ? Number(order.disputeDifference) : null,
      disputeResolvedAt: order.disputeResolvedAt?.toISOString() || null,
      giftcards: order.giftcards.map((card) => ({
        ...card,
        amount: Number(card.amount),
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
      })),
    }));
  } catch (error) {
    console.error("Error fetching all disputes:", error);
    return [];
  }
}
