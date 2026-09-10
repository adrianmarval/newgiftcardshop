// ─────────────────────────────────────────────────────────────────────────────
// Cron jobs — definiciones de todos los schedulers del proceso.
// server.ts llama startAllJobs() DESPUÉS de app.prepare() via import dinámico:
// este módulo carga el grafo de servicios de forma lazy (no antes de que Next
// esté listo). NO importar estáticamente desde server.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { logger } from '@/lib/logger';
import { registerCron, type CronJobDef } from './register-cron';

const MIN = 60 * 1000;

// ── Giftcard Escalation ───────────────────────────────────────────────────────
// Tick FIJO de 1 minuto — el mínimo que permite la validación del setting
// escalation_duration_minutes (min: 1). La config se re-lee en CADA tick.

const escalationJob: CronJobDef = {
  name: 'Escalation',
  intervalMs: 1 * MIN,
  onInit: async () => {
    const { getConfig } = await import('@/lib/services/giftcard/escalation');
    const config = await getConfig();
    logger.info(`[Escalation] Iniciado - tick: 1min, duración por tier: ${config.durationMinutes}min, habilitado: ${config.enabled}`);
  },
  run: async () => {
    const { getConfig, processEscalationTiers } = await import('@/lib/services/giftcard/escalation');
    const config = await getConfig();
    if (!config.enabled) return;

    const result = await processEscalationTiers();
    if (result.processed > 0) {
      logger.action('batch', 'escalation-cron', `${result.processed} tarjetas procesadas en escalación`, {
        metadata: { processed: result.processed },
      });
    }
  },
};

// ── Log Auto-Purge ────────────────────────────────────────────────────────────
// Cron INDEPENDIENTE (antes vivía escondido dentro del tick de escalación —
// dos responsabilidades en un cron: desactivar escalación también desactivaba
// el purge). Borra logs > 30 días, cada hora. Fallo no crítico.

const logPurgeJob: CronJobDef = {
  name: 'AutoPurge',
  intervalMs: 60 * MIN,
  run: async () => {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const deleted = await prisma.appLog.deleteMany({ where: { timestamp: { lt: cutoff } } });
      if (deleted.count > 0) {
        logger.info(`[AutoPurge] ${deleted.count} logs antiguos eliminados`);
      }
    } catch {
      // Auto-purge failure is non-critical
    }
  },
};

// ── Batch Auto-Cancel (safety net) ────────────────────────────────────────────

const batchAutoCancelJob: CronJobDef = {
  name: 'BatchAutoCancel',
  intervalMs: 15 * MIN,
  run: async () => {
    const { sweepCancellableBatches } = await import('@/lib/services/giftcard/batch-cancel');
    const cancelled = await sweepCancellableBatches();

    if (cancelled.length === 0) return;

    logger.action('batch', 'auto-cancel-cron', `${cancelled.length} lote(s) auto-cancelado(s)`, {
      metadata: { cancelled: cancelled.map((c) => c.batchId) },
    });

    const { notifySellerBatchCancelled } = await import('@/lib/notifications/notify');
    const { publishToUsers, publishToRole } = await import('@/lib/realtime/bus');
    publishToUsers(cancelled.map((c) => c.sellerId).filter((id): id is string => Boolean(id)), ['batches', 'stats']);
    publishToRole('ADMIN', ['batches']);
    for (const { batchId, sellerId } of cancelled) {
      if (sellerId) {
        notifySellerBatchCancelled(sellerId, batchId).catch((err) =>
          logger.error('Error notificando seller post-sweep-cancel', {
            flow: 'batch',
            action: 'auto-cancel-cron',
            metadata: { batchId, sellerId },
            error: { name: err.name, message: err.message },
          }),
        );
      }
    }
  },
};

// ── Seller Auto-Pay + Payment Sync (safety net) ───────────────────────────────

const autoPayJob: CronJobDef = {
  name: 'AutoPay',
  intervalMs: 5 * MIN,
  run: async () => {
    // 1. Auto-pay sweep (reads the setting each cycle — toggle without restart)
    const { getAutoPaySellers } = await import('@/lib/settings/settings.service');
    if (await getAutoPaySellers()) {
      const { sweepPayableBatches } = await import('@/lib/services/payment/auto-pay');
      const sweep = await sweepPayableBatches();

      if (sweep.processed > 0) {
        logger.action('payment', 'auto-pay-cron', `Auto-pay sweep: ${sweep.paid} pagado(s), ${sweep.failed} fallido(s) de ${sweep.processed} candidato(s)`, {
          metadata: { ...sweep },
        });
      }
    }

    // 2. Sync pending seller payouts with Binance (always — resolves manual payouts too)
    const { syncPendingSellerPayments } = await import('@/lib/services/payment/seller-payout');
    const sync = await syncPendingSellerPayments();

    if (sync.resolved > 0 || sync.failed > 0) {
      logger.action('payment', 'sync-payouts-cron', `Sync payouts: ${sync.resolved} completado(s), ${sync.failed} fallido(s), ${sync.stillPending} pendiente(s)`, {
        metadata: { ...sync },
      });
    }

    // 3. Sync pending admin withdrawals with Binance (resolves network-error PENDINGs)
    const { syncPendingAdminWithdrawals } = await import('@/lib/services/payment/admin-withdrawal');
    const withdrawalSync = await syncPendingAdminWithdrawals();

    if (withdrawalSync.resolved > 0 || withdrawalSync.failed > 0) {
      logger.action('payment', 'sync-withdrawals-cron', `Sync retiros admin: ${withdrawalSync.resolved} completado(s), ${withdrawalSync.failed} fallido(s), ${withdrawalSync.stillPending} pendiente(s)`, {
        metadata: { ...withdrawalSync },
      });
    }
  },
};

// ── Stock Reminder Sweep ──────────────────────────────────────────────────────

const stockReminderJob: CronJobDef = {
  name: 'StockReminder',
  intervalMs: 5 * MIN,
  run: async () => {
    const { sweepStockReminders } = await import('@/lib/notifications/stock-reminder');
    const reminders = await sweepStockReminders();
    if (reminders.sent > 0) {
      logger.info(`[StockReminder] Sweep: ${reminders.sent} recordatorio(s) enviado(s), ${reminders.skipped} descartado(s)`);
    }
  },
};

// ── Payment Reminder Sweep ────────────────────────────────────────────────────

const paymentReminderJob: CronJobDef = {
  name: 'PaymentReminder',
  intervalMs: 5 * MIN,
  run: async () => {
    const { sweepPaymentReminders } = await import('@/lib/notifications/payment-reminder');
    const reminders = await sweepPaymentReminders();
    if (reminders.sent > 0) {
      logger.info(`[PaymentReminder] Sweep: ${reminders.sent} recordatorio(s) enviado(s), ${reminders.skipped} descartado(s)`);
    }
  },
};

// ── Pending Order Alert Sweep ─────────────────────────────────────────────────

const pendingOrderAlertJob: CronJobDef = {
  name: 'PendingOrderAlert',
  intervalMs: 5 * MIN,
  run: async () => {
    const { sweepPendingOrderAlerts } = await import('@/lib/notifications/pending-order-alert');
    const alerts = await sweepPendingOrderAlerts();
    if (alerts.sent > 0) {
      logger.info(`[PendingOrderAlert] Sweep: ${alerts.sent} alerta(s) enviada(s), ${alerts.skipped} descartada(s)`);
    }
  },
};

const JOBS: CronJobDef[] = [
  escalationJob,
  logPurgeJob,
  batchAutoCancelJob,
  autoPayJob,
  stockReminderJob,
  paymentReminderJob,
  pendingOrderAlertJob,
];

export async function startAllJobs(): Promise<void> {
  for (const job of JOBS) {
    await registerCron(job);
  }
}
