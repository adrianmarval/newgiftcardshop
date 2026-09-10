import 'dotenv/config';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
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

// ── Webhook secret verification (compartido por ambos bots) ───────────────────
// Devuelve true si el request está autorizado; si no, ya respondió (500/401).
function verifyWebhookSecret(req: IncomingMessage, res: ServerResponse): boolean {
  const secret = process.env.WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    res.statusCode = 500;
    res.end('Webhook secret not configured');
    return false;
  }
  if (req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return false;
  }
  return true;
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
      if (!verifyWebhookSecret(req, res)) return;
      return webhookCallback(sellerEntry.bot, 'http')(req, res);
    }
    if (isProd && buyerEntry && pathname === buyerEntry.webhookPath) {
      if (!verifyWebhookSecret(req, res)) return;
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

// ── Cron jobs (escalación, auto-cancel, auto-pay, recordatorios, log-purge) ────
// Import dinámico POST-prepare: jobs.ts carga el grafo de servicios lazy.
const { startAllJobs } = await import('./src/lib/scheduler/jobs.js');
await startAllJobs();

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
