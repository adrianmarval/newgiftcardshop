import { createServer } from 'node:http';
import next from 'next';
import { webhookCallback } from 'grammy';

const isProd = process.env.NODE_ENV === 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

// ── Next.js ────────────────────────────────────────────────────────────────────
const app = next({ dev: !isProd, hostname, port });
const handleNextRequest = app.getRequestHandler();

console.log('[Server] Preparando Next.js...');
await app.prepare();
console.log('[Server] Next.js listo.');

// ── Bots (opcionales — Next.js arranca igual si faltan los tokens) ─────────────
type BotEntry = { bot: any; webhookPath: string; name: string };

async function tryInitBot(
  name: string,
  tokenVar: string,
  importPath: string,
  factoryFn: string,
): Promise<BotEntry | null> {
  const token = process.env[tokenVar];
  if (!token) {
    console.warn(`[Server] ⚠️  ${tokenVar} no configurado — ${name} deshabilitado`);
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
  tryInitBot('BuyerBot',  'BUYER_BOT_TOKEN',  './src/bot/buyer-bot/index.js',  'createBuyerBot'),
]);

// ── HTTP Server ────────────────────────────────────────────────────────────────
const httpServer = createServer(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url!, baseUrl);
    const pathname = url.pathname;

    // Webhook routing — solo en producción
    if (isProd && sellerEntry && pathname === sellerEntry.webhookPath) {
      return webhookCallback(sellerEntry.bot, 'http')(req, res);
    }
    if (isProd && buyerEntry && pathname === buyerEntry.webhookPath) {
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

httpServer.listen(port, () => {
  console.log(`\n> Ready on http://${hostname}:${port}`);
  console.log(`> Modo: ${isProd ? 'producción (webhook)' : 'desarrollo (long polling)'}`);
});

// ── Bot startup ────────────────────────────────────────────────────────────────
async function startBot(entry: BotEntry): Promise<void> {
  if (isProd) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL es obligatorio en producción');
    await entry.bot.api.setWebhook(`${appUrl}${entry.webhookPath}`);
    console.log(`[${entry.name}] Webhook registrado: ${appUrl}${entry.webhookPath} ✓`);
  } else {
    // Borra webhook previo
    await entry.bot.api
      .deleteWebhook({ drop_pending_updates: false })
      .catch((err: any) => console.warn(`[${entry.name}] deleteWebhook warning (ignorado):`, err.message));

    entry.bot
      .start({ onStart: () => console.log(`[${entry.name}] Polling activo ✓`) })
      .catch((err: any) => console.error(`[${entry.name}] ❌ Token inválido o error de red:`, err.message));
  }
}

for (const entry of [sellerEntry, buyerEntry]) {
  if (entry) {
    startBot(entry).catch((err) =>
      console.error(`[${entry.name}] Error en startup:`, err.message),
    );
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const shutdown = () => {
  sellerEntry?.bot.stop();
  buyerEntry?.bot.stop();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
