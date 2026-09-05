import 'dotenv/config';
import { createServer } from 'node:http';
import next from 'next';
import { webhookCallback } from 'grammy';

const isProd = process.env.NODE_ENV === 'production';

// Lazy import to avoid circular deps — logger is initialized after app.prepare
let serverLogger: typeof import('./src/lib/logger').logger | null = null;

async function getServerLogger() {
  if (!serverLogger) {
    const { logger } = await import('./src/lib/logger');
    serverLogger = logger;
  }
  return serverLogger;
}

// ── Giftcard Escalation Service ─────────────────────────────────────────────────

async function initEscalationService() {
  try {
    const { getConfig, processEscalationTiers } = await import('./src/lib/services/giftcard/escalation');
    const log = await getServerLogger();

    // Tick FIJO de 1 minuto — el mínimo que permite la validación del setting
    // escalation_duration_minutes (min: 1). La config se re-lee en CADA tick:
    // un setInterval congela su intervalo al crearse, así que derivarlo del
    // setting dejaba el scheduler corriendo con la duración del boot aunque el
    // admin la cambiara desde el panel (bug verificado: setting a 1min, ticks
    // cada 5min hasta reiniciar el proceso).
    const TICK_MS = 60 * 1000;

    const initialConfig = await getConfig();
    log.info(`[Escalation] Iniciado - tick: 1min, duración por tier: ${initialConfig.durationMinutes}min, habilitado: ${initialConfig.enabled}`);

    let escalationRunning = false;

    setInterval(async () => {
      if (escalationRunning) {
        log.info('[Escalation] Skipping — previous run still active');
        return;
      }
      escalationRunning = true;
      try {
        const config = await getConfig();
        if (!config.enabled) {
          return;
        }

        const result = await processEscalationTiers();
        if (result.processed > 0) {
          log.action('batch', 'escalation-cron', `${result.processed} tarjetas procesadas en escalación`, {
            metadata: { processed: result.processed },
          });
        }

        // Auto-purge logs mayores a 30 días (cada ciclo de escalación)
        try {
          const { default: prisma } = await import('./src/lib/prisma');
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          const deleted = await prisma.appLog.deleteMany({ where: { timestamp: { lt: cutoff } } });
          if (deleted.count > 0) {
            log.info(`[AutoPurge] ${deleted.count} logs antiguos eliminados`);
          }
        } catch {
          // Auto-purge failure is non-critical
        }
      } catch (err) {
        log.error('[Escalation] Error en ciclo', {
          error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
        });
      } finally {
        escalationRunning = false;
      }
    }, TICK_MS);
  } catch (err) {
    const log = await getServerLogger();
    log.error('[Escalation] Error al iniciar', {
      error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
    });
  }
}
// ── Batch Auto-Cancel (safety net) ───────────────────────────────────────────

async function initBatchAutoCancelService() {
  try {
    const { sweepCancellableBatches } = await import('./src/lib/services/giftcard/batch-cancel.service');
    const log = await getServerLogger();

    const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    log.info('[BatchAutoCancel] Iniciado - intervalo: 15min');

    let sweepRunning = false;

    setInterval(async () => {
      if (sweepRunning) {
        log.info('[BatchAutoCancel] Skipping — previous sweep still active');
        return;
      }
      sweepRunning = true;
      try {
        const cancelled = await sweepCancellableBatches();

        if (cancelled.length > 0) {
          log.action('batch', 'auto-cancel-cron', `${cancelled.length} lote(s) auto-cancelado(s)`, {
            metadata: { cancelled: cancelled.map((c) => c.batchId) },
          });

          const { notifySellerBatchCancelled } = await import('./src/lib/notifications/notification.service');
          const { publishToUsers, publishToRole } = await import('./src/lib/realtime/bus');
          publishToUsers(cancelled.map((c) => c.sellerId).filter((id): id is string => Boolean(id)), ['batches', 'stats']);
          publishToRole('ADMIN', ['batches']);
          for (const { batchId, sellerId } of cancelled) {
            if (sellerId) {
              notifySellerBatchCancelled(sellerId, batchId).catch((err) =>
                log.error('Error notificando seller post-sweep-cancel', {
                  flow: 'batch',
                  action: 'auto-cancel-cron',
                  metadata: { batchId, sellerId },
                  error: { name: err.name, message: err.message },
                }),
              );
            }
          }
        }
      } catch (err) {
        log.error('[BatchAutoCancel] Error en sweep', {
          error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
        });
      } finally {
        sweepRunning = false;
      }
    }, INTERVAL_MS);
  } catch (err) {
    const log = await getServerLogger();
    log.error('[BatchAutoCancel] Error al iniciar', {
      error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
    });
  }
}

// ── Seller Auto-Pay + Payment Sync (safety net) ──────────────────────────────

async function initAutoPayService() {
  try {
    const { sweepPayableBatches } = await import('./src/lib/services/payment/auto-pay.service');
    const { syncPendingSellerPayments } = await import('./src/lib/services/payment/seller-payout.service');
    const { syncPendingAdminWithdrawals } = await import('./src/lib/services/payment/admin-withdrawal.service');
    const { getAutoPaySellers } = await import('./src/lib/settings/settings.service');
    const log = await getServerLogger();

    const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    log.info('[AutoPay] Iniciado - intervalo: 5min');

    let cycleRunning = false;

    setInterval(async () => {
      if (cycleRunning) {
        log.info('[AutoPay] Skipping — previous cycle still active');
        return;
      }
      cycleRunning = true;
      try {
        // 1. Auto-pay sweep (reads the setting each cycle — toggle without restart)
        if (await getAutoPaySellers()) {
          const sweep = await sweepPayableBatches();

          if (sweep.processed > 0) {
            log.action('payment', 'auto-pay-cron', `Auto-pay sweep: ${sweep.paid} pagado(s), ${sweep.failed} fallido(s) de ${sweep.processed} candidato(s)`, {
              metadata: { ...sweep },
            });
          }
        }

        // 2. Sync pending seller payouts with Binance (always — resolves manual payouts too)
        const sync = await syncPendingSellerPayments();

        if (sync.resolved > 0 || sync.failed > 0) {
          log.action('payment', 'sync-payouts-cron', `Sync payouts: ${sync.resolved} completado(s), ${sync.failed} fallido(s), ${sync.stillPending} pendiente(s)`, {
            metadata: { ...sync },
          });
        }

        // 3. Sync pending admin withdrawals with Binance (resolves network-error PENDINGs)
        const withdrawalSync = await syncPendingAdminWithdrawals();

        if (withdrawalSync.resolved > 0 || withdrawalSync.failed > 0) {
          log.action(
            'payment',
            'sync-withdrawals-cron',
            `Sync retiros admin: ${withdrawalSync.resolved} completado(s), ${withdrawalSync.failed} fallido(s), ${withdrawalSync.stillPending} pendiente(s)`,
            {
              metadata: { ...withdrawalSync },
            },
          );
        }
      } catch (err) {
        log.error('[AutoPay] Error en ciclo', {
          error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
        });
      } finally {
        cycleRunning = false;
      }
    }, INTERVAL_MS);
  } catch (err) {
    const log = await getServerLogger();
    log.error('[AutoPay] Error al iniciar', {
      error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
    });
  }
}

// ── Stock Reminder Sweep ──────────────────────────────────────────────────────

async function initStockReminderService() {
  try {
    const { sweepStockReminders } = await import('./src/lib/notifications/stock-reminder.service');
    const log = await getServerLogger();

    const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (la due-ness por marca se evalúa dentro)
    log.info('[StockReminder] Iniciado - sweep cada 5min (recordatorios de stock varado)');

    let sweepRunning = false;

    setInterval(async () => {
      if (sweepRunning) {
        log.info('[StockReminder] Skipping — previous sweep still active');
        return;
      }
      sweepRunning = true;
      try {
        const reminders = await sweepStockReminders();
        if (reminders.sent > 0) {
          log.info(`[StockReminder] Sweep: ${reminders.sent} recordatorio(s) enviado(s), ${reminders.skipped} descartado(s)`);
        }
      } catch (err) {
        log.error('[StockReminder] Error en sweep', {
          error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
        });
      } finally {
        sweepRunning = false;
      }
    }, INTERVAL_MS);
  } catch (err) {
    const log = await getServerLogger();
    log.error('[StockReminder] Error al iniciar', {
      error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
    });
  }
}

// ── Payment Reminder Sweep ────────────────────────────────────────────────────

async function initPaymentReminderService() {
  try {
    const { sweepPaymentReminders } = await import('./src/lib/notifications/payment-reminder.service');
    const log = await getServerLogger();

    const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (la cadencia por orden se evalúa dentro con el setting)
    log.info('[PaymentReminder] Iniciado - sweep cada 5min (recordatorios de pago pendiente)');

    let sweepRunning = false;

    setInterval(async () => {
      if (sweepRunning) {
        log.info('[PaymentReminder] Skipping — previous sweep still active');
        return;
      }
      sweepRunning = true;
      try {
        const reminders = await sweepPaymentReminders();
        if (reminders.sent > 0) {
          log.info(`[PaymentReminder] Sweep: ${reminders.sent} recordatorio(s) enviado(s), ${reminders.skipped} descartado(s)`);
        }
      } catch (err) {
        log.error('[PaymentReminder] Error en sweep', {
          error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
        });
      } finally {
        sweepRunning = false;
      }
    }, INTERVAL_MS);
  } catch (err) {
    const log = await getServerLogger();
    log.error('[PaymentReminder] Error al iniciar', {
      error: { name: (err as Error).name ?? 'Error', message: (err as Error).message ?? 'Unknown' },
    });
  }
}

const hostname = 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

// ── Bots (opcionales — Next.js arranca igual si faltan los tokens) ─────────────
type BotEntry = { bot: any; webhookPath: string; name: string };

async function tryInitBot(name: string, tokenVar: string, importPath: string, factoryFn: string): Promise<BotEntry | null> {
  const token = process.env[tokenVar];
  if (!token) {
    console.warn(`[Server]   ${tokenVar} no configurado — ${name} deshabilitado`);
    return null;
  }
  try {
    const module = await import(importPath);
    const result = module[factoryFn]();
    return { bot: result.bot, webhookPath: result.webhookPath, name };
  } catch (err: any) {
    console.error(`[Server] ❌ Error al crear ${name}:`, err.message);
    return null;
  }
}

const [sellerEntry, buyerEntry] = await Promise.all([
  tryInitBot('SellerBot', 'SELLER_BOT_TOKEN', './src/bot/seller-bot/index.js', 'createSellerBot'),
  tryInitBot('BuyerBot', 'BUYER_BOT_TOKEN', './src/bot/buyer-bot/index.js', 'createBuyerBot'),
]);

// ── Registrar bots en BotRegistry para Notificaciones ─────────────────────────
try {
  const { BotRegistry } = await import('./src/lib/notifications/bot-registry');
  if (buyerEntry) BotRegistry.registerBuyerBot(buyerEntry.bot);
  if (sellerEntry) BotRegistry.registerSellerBot(sellerEntry.bot);
  console.log('[BotRegistry] Bots registrados para Notificaciones ✓');
} catch (err: any) {
  console.warn('[BotRegistry] No se pudo registrar bots (Notificaciones por Telegram deshabilitadas):', err.message);
}

// ── HTTP Server ────────────────────────────────────────────────────────────────
const httpServer = createServer(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url!, baseUrl);
    const pathname = url.pathname;

    // Webhook routing — solo en producción
    if (isProd && sellerEntry && pathname === sellerEntry.webhookPath) {
      const secret = process.env.WEBHOOK_SECRET_TOKEN;
      if (!secret) {
        res.statusCode = 500;
        return res.end('Webhook secret not configured');
      }
      if (req.headers['x-telegram-bot-api-secret-token'] !== secret) {
        res.statusCode = 401;
        return res.end('Unauthorized');
      }
      return webhookCallback(sellerEntry.bot, 'http')(req, res);
    }
    if (isProd && buyerEntry && pathname === buyerEntry.webhookPath) {
      const secret = process.env.WEBHOOK_SECRET_TOKEN;
      if (!secret) {
        res.statusCode = 500;
        return res.end('Webhook secret not configured');
      }
      if (req.headers['x-telegram-bot-api-secret-token'] !== secret) {
        res.statusCode = 401;
        return res.end('Unauthorized');
      }
      return webhookCallback(buyerEntry.bot, 'http')(req, res);
    }

    // handleNextRequest maneja el resto
    await handleNextRequest(req, res);
  } catch (err) {
    console.error('[Server] Error handling request:', req.url, err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

// ── Next.js ────────────────────────────────────────────────────────────────────
const app = next({ dev: !isProd, hostname, port });
const handleNextRequest = app.getRequestHandler();

console.log('[Server] Preparando Next.js...');
await app.prepare();
const handleUpgrade = app.getUpgradeHandler();
const log = await getServerLogger();
log.info('Next.js preparado');

// ── Giftcard Escalation ───────────────────────────────────────────────────────
await initEscalationService();

// ── Batch Auto-Cancel ─────────────────────────────────────────────────────────
await initBatchAutoCancelService();

// ── Seller Auto-Pay + Payment Sync ────────────────────────────────────────────
await initAutoPayService();

// ── Stock Reminder Sweep ──────────────────────────────────────────────────────
await initStockReminderService();

// ── Payment Reminder Sweep ────────────────────────────────────────────────────
await initPaymentReminderService();

// Fail-fast ante puerto ocupado: una segunda instancia que no puede bindear
// pero sigue viva es un ZOMBIE peligroso — sus crons y bots (long polling)
// siguen corriendo con código viejo y compiten con la instancia real (races
// en escalación/tier drops, updates de Telegram robados entre pollers).
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] ❌ Puerto ${port} ocupado — ya hay otra instancia corriendo.`);
    console.error(`[Server]    Identifícala con: lsof -nP -iTCP:${port} -sTCP:LISTEN`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(port, () => {
  console.log(`\n> Ready on http://${hostname}:${port}`);
  console.log(`> Modo: ${isProd ? 'producción (webhook)' : 'desarrollo (long polling)'}`);
});

// ── WebSocket Upgrade (HMR en dev mode) ──────────────────────────────────────
httpServer.on('upgrade', (req, socket, head) => {
  handleUpgrade(req, socket, head);
});

// ── Bot startup ────────────────────────────────────────────────────────────────
async function startBot(entry: BotEntry): Promise<void> {
  if (isProd) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL es obligatorio en producción');
    const webhookSecret = process.env.WEBHOOK_SECRET_TOKEN;
    await entry.bot.api.setWebhook(`${appUrl}${entry.webhookPath}`, {
      drop_pending_updates: true,
      ...(webhookSecret ? { secret_token: webhookSecret } : {}),
    });
    console.log(`[${entry.name}] Webhook registrado: ${appUrl}${entry.webhookPath} ✓`);
  } else {
    // Borra webhook previo y limpia cola
    await entry.bot.api
      .deleteWebhook({ drop_pending_updates: true })
      .catch((err: any) => console.warn(`[${entry.name}] deleteWebhook warning (ignorado):`, err.message));

    entry.bot
      .start({
        drop_pending_updates: true,
        onStart: () => console.log(`[${entry.name}] Polling activo ✓`),
      })
      .catch((err: any) => console.error(`[${entry.name}] ❌ Token inválido o error de red:`, err.message));
  }
}

for (const entry of [sellerEntry, buyerEntry]) {
  if (entry) {
    startBot(entry).catch((err) => console.error(`[${entry.name}] Error en startup:`, err.message));
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const shutdown = async () => {
  sellerEntry?.bot.stop();
  buyerEntry?.bot.stop();

  // Flush logger buffer before exit
  try {
    const { gracefulFlush } = await import('./src/lib/logger/db-transport');
    await gracefulFlush();
  } catch {
    // ignored
  }
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
