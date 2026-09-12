import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { withRole } from '@/lib/auth/route-guard';
import type { Role } from '@/generated/prisma/enums';
import { serializeDates } from '@/lib/utils';

// Services (lógica compartida con las server actions — misma fuente de verdad)
import { listOrdersService, getOrderTabCounts } from '@/lib/services/order/order-list';
import { listBatchesService, listAdminIssues, getBatchTabCounts } from '@/lib/services/giftcard';
import { listAdminPayments, getCachedUsdtBalances } from '@/lib/services/payment';
import { listAppLogs } from '@/lib/services/logs';
import { listAdminUsers, searchAdminUsers } from '@/lib/services/user';
import {
  getBuyerStats,
  getSellerStats,
  getProfitStats,
  getInventoryStats,
  getStockAgingReport,
  getVolumeStats,
  getAdminLiveStock,
  getLiveAvailability,
  getRecentOrders,
  getRecentBatches,
} from '@/lib/services/stats';
import { listUserNotifications, countUnreadNotifications } from '@/lib/notifications/queries/list-queries';
import { getToursSeenForUser } from '@/lib/services/tours';
import { isSecurityUnlocked, getSecurityStatus } from '@/lib/services/security';
import { getOrderCardsForBuyer } from '@/lib/services/order/order-cards';
import { listActiveSessions } from '@/lib/services/user/user-sessions';
import { getSearchPreferences } from '@/lib/services/user/search-preferences';
import { getWallet } from '@/lib/services/payment/wallet';
import { getCoinCatalog } from '@/lib/services/coin';
import { getPlatformBalance, getBinancePayId } from '@/lib/settings/settings.service';
import { getDecryptedTelegramPhotoUrl } from '@/lib/telegram';
import { getActiveProvider } from '@/lib/ai-provider-config';

// Schemas zod compartidos con las actions (misma validación de input)
import { listOrdersInputSchema as adminOrdersSchema } from '@/actions/admin/orders/schemas';
import { adminBatchListInputSchema as adminBatchesSchema } from '@/actions/admin/batches/schemas';
import { listPaymentsInputSchema as adminPaymentsSchema } from '@/actions/admin/payments/schemas';
import { listIssuesInputSchema as adminIssuesSchema } from '@/actions/admin/issues/schemas';
import { listLogsInputSchema as adminLogsSchema } from '@/actions/admin/logs/schemas';
import { listUsersInputSchema as adminUsersSchema } from '@/actions/admin/users/schemas';
import { listBatchesInputSchema as sellerBatchesSchema } from '@/actions/seller/batches/schemas';
import { listOrdersInputSchema as buyerOrdersSchema } from '@/actions/buyer/orders/schemas';
import { listNotificationsInputSchema as notificationsSchema } from '@/actions/notifications/schemas';
import { getVolumeStatsInputSchema as adminVolumeStatsSchema } from '@/actions/admin/stats/schemas';
import { getOrderCardsInputSchema as orderCardsSchema } from '@/actions/buyer/giftcards/schemas';

export const dynamic = 'force-dynamic';

/**
 * /api/query/[name] — transporte GET para las lecturas client-side
 * (React Query). Ejecuta los SERVICES directamente (la misma lógica que las
 * server actions, misma fuente de verdad) con guard de rol espejo de los
 * action clients (withRole — ver lib/auth/route-guard.ts).
 *
 * ¿Por qué GET y no la action desde el cliente? Una server action invocada
 * imperativamente entra a la cola de transiciones del App Router; si su reply
 * aterriza con una navegación en vuelo, el router DESCARTA la navegación y la
 * URL revierte al último commit (verificado empíricamente: ~60% de aborts con
 * action POST en vuelo vs 0% con GET plano). Como el modelo realtime invalida
 * queries constantemente (SSE), SIEMPRE hay refetches en vuelo — la race era
 * inevitable. Un fetch GET no toca el router. Bonus: URL estable entre
 * deploys (adiós "Failed to find Server Action" en tabs viejas).
 *
 * REGISTRY: solo lecturas. Las mutaciones quedan como server actions (su
 * integración con el router es deseable ahí). Las keys matchean los query
 * keys de React Query / REALTIME_QUERY_KEYS.
 */

const ADMIN: Role[] = ['ADMIN'];
const SELLER: Role[] = ['SELLER', 'ADMIN'];
const BUYER: Role[] = ['BUYER', 'ADMIN'];

/** Wrapper idéntico al de las actions de listas: { success: true, items, pagination }. */
async function listResult(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promise: Promise<{ items: any; pagination: any }>,
) {
  const result = await promise;
  return { success: true as const, items: result.items, pagination: result.pagination };
}

interface QueryDef {
  /** null = cualquier sesión activa (espejo de authActionClient). */
  roles: Role[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: z.ZodType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (input: any, userId: string) => Promise<unknown>;
}

const QUERY_REGISTRY: Record<string, QueryDef> = {
  // ── Listas admin ─────────────────────────────────────────────────────────
  'admin-orders': {
    roles: ADMIN,
    schema: adminOrdersSchema,
    run: (i) => listResult(listOrdersService({ scope: 'admin', ...i })),
  },
  'admin-batches': {
    roles: ADMIN,
    schema: adminBatchesSchema,
    run: (i) => listResult(listBatchesService({ scope: 'admin', ...i })),
  },
  'admin-payments': { roles: ADMIN, schema: adminPaymentsSchema, run: (i) => listResult(listAdminPayments(i)) },
  'admin-issues': { roles: ADMIN, schema: adminIssuesSchema, run: (i) => listResult(listAdminIssues(i)) },
  'admin-logs': { roles: ADMIN, schema: adminLogsSchema, run: (i) => listResult(listAppLogs(i)) },
  'admin-users': { roles: ADMIN, schema: adminUsersSchema, run: (i) => listResult(listAdminUsers(i)) },
  // Búsqueda server-side para los combobox de usuarios (reemplaza la carga
  // total de getUsersByRole — take acotado en el service).
  'admin-user-search': {
    roles: ADMIN,
    schema: z.object({
      role: z.enum(['SELLER', 'BUYER', 'ADMIN', 'ALL']).optional(),
      query: z.string().optional(),
      id: z.string().optional(),
    }),
    run: (i) => searchAdminUsers(i),
  },

  // ── Listas seller / buyer ────────────────────────────────────────────────
  'seller-batches': {
    roles: SELLER,
    schema: sellerBatchesSchema,
    run: (i, userId) => listResult(listBatchesService({ scope: 'seller', userId, ...i })),
  },
  'buyer-orders': {
    roles: BUYER,
    schema: buyerOrdersSchema,
    run: async (i, userId) => {
      const codesUnlocked = await isSecurityUnlocked(userId);
      return listResult(listOrdersService({ scope: 'buyer', userId, codesUnlocked, ...i }));
    },
  },

  // ── Tab counts (badges numéricos de los quick-tabs de las listas) ───────
  // Sin input: cuentan la carga accionable total del scope, no los resultados
  // del filtro actual. Se invalidan via SSE junto a su lista (query-keys.ts).
  'admin-order-tab-counts': { roles: ADMIN, run: () => getOrderTabCounts('admin') },
  'admin-batch-tab-counts': { roles: ADMIN, run: () => getBatchTabCounts('admin') },
  'buyer-order-tab-counts': { roles: BUYER, run: (_i, userId) => getOrderTabCounts('buyer', userId) },
  'seller-batch-tab-counts': { roles: SELLER, run: (_i, userId) => getBatchTabCounts('seller', userId) },

  // ── Notificaciones ───────────────────────────────────────────────────────
  'unread-counts': {
    roles: null,
    run: async (_i, userId) => ({ success: true as const, count: await countUnreadNotifications(userId) }),
  },
  'notifications-page': {
    roles: null,
    schema: notificationsSchema,
    run: async (i, userId) => ({ success: true as const, ...(await listUserNotifications(userId, i)) }),
  },

  // ── Buyer portal ─────────────────────────────────────────────────────────
  'live-availability': { roles: BUYER, run: (_i, userId) => getLiveAvailability(userId) },
  'buyer-dashboard-stats': { roles: BUYER, run: (_i, userId) => getBuyerStats(userId) },
  'buyer-recent-orders': { roles: BUYER, run: (_i, userId) => getRecentOrders(userId) },

  // ── Seller portal ────────────────────────────────────────────────────────
  'seller-dashboard-stats': { roles: SELLER, run: (_i, userId) => getSellerStats(userId) },
  'seller-recent-batches': { roles: SELLER, run: (_i, userId) => getRecentBatches(userId) },

  // ── Admin home ───────────────────────────────────────────────────────────
  'binance-balances': { roles: ADMIN, run: () => getCachedUsdtBalances() },
  'platform-balance': {
    roles: ADMIN,
    run: async () => ({ success: true as const, balance: Number(await getPlatformBalance()) }),
  },
  'admin-profit-stats': { roles: ADMIN, run: () => getProfitStats() },
  'admin-inventory-stats': { roles: ADMIN, run: () => getInventoryStats() },
  'admin-stock-aging': { roles: ADMIN, run: () => getStockAgingReport() },
  'admin-volume-stats': {
    roles: ADMIN,
    schema: adminVolumeStatsSchema,
    run: (i) => getVolumeStats(i.brandCountryId ?? null),
  },
  'admin-live-stock': { roles: ADMIN, run: () => getAdminLiveStock() },

  // ── Misc client-side reads ───────────────────────────────────────────────
  'tours-seen': {
    roles: null,
    run: async (_i, userId) => ({ success: true as const, toursSeen: await getToursSeenForUser(userId) }),
  },
  'admin-telegram-photo': {
    roles: ADMIN,
    schema: z.object({ userId: z.string() }),
    run: async (i) => {
      const dataUrl = await getDecryptedTelegramPhotoUrl(i.userId);
      if (!dataUrl) return { success: false as const, error: 'Failed to get profile photo' };
      return { success: true as const, dataUrl };
    },
  },

  // ── Mount-reads (antes server actions en useEffect — la race nav-abort) ──
  'order-cards': {
    roles: BUYER,
    schema: orderCardsSchema,
    run: async (i, userId) => ({ success: true as const, ...(await getOrderCardsForBuyer(i.orderId, userId)) }),
  },
  'security-status': {
    roles: BUYER,
    run: async (_i, userId) => {
      const status = await getSecurityStatus(userId);
      return {
        success: true as const,
        hasPin: status.hasPin,
        hasPasskey: status.hasPasskey,
        pinLocked: status.pinLocked,
        isUnlocked: status.isUnlocked,
        unlockedUntil: status.unlockedUntil ? status.unlockedUntil.toISOString() : null,
      };
    },
  },
  'active-sessions': {
    roles: null,
    run: async (_i, userId) => ({ success: true as const, sessions: await listActiveSessions(userId) }),
  },
  'payment-method': {
    roles: SELLER,
    run: async (_i, userId) => {
      const pm = await getWallet(userId);
      return {
        success: true as const,
        paymentMethod: pm
          ? {
              id: pm.id,
              coinId: pm.coinId,
              networkId: pm.networkId,
              address: pm.address,
              isBinanceWallet: pm.isBinanceWallet,
              updatedAt: pm.updatedAt,
              coin: { id: pm.coin.id, name: pm.coin.name, symbol: pm.coin.symbol, decimals: pm.coin.decimals },
              network: { id: pm.network.id, name: pm.network.name, description: pm.network.description, regex: pm.network.regex },
            }
          : null,
      };
    },
  },
  'seller-coins': {
    roles: SELLER,
    run: async () => {
      const coins = await getCoinCatalog();
      return {
        success: true as const,
        coins: coins.map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol,
          decimals: c.decimals,
          isActive: c.isActive,
          networks: c.networks.map((cn) => ({
            id: cn.id,
            coinId: cn.coinId,
            networkId: cn.networkId,
            network: {
              id: cn.network.id,
              name: cn.network.name,
              description: cn.network.description,
              regex: cn.network.regex,
              isActive: cn.network.isActive,
            },
          })),
        })),
      };
    },
  },
  'search-preferences': {
    roles: BUYER,
    run: async (_i, userId) => ({ success: true as const, ...(await getSearchPreferences(userId)) }),
  },
  'binance-pay-id': {
    roles: null,
    run: async () => ({ success: true as const, binancePayId: await getBinancePayId() }),
  },
  // Sell wizard: si no hay provider de visión configurado, el pipeline saltea el
  // OCR y las capturas se adjuntan al batch sin vincular (el admin las ve en el lote).
  'ocr-availability': {
    roles: SELLER,
    run: async () => ({ success: true as const, ocrEnabled: (await getActiveProvider()) !== null }),
  },
};

export const GET = (request: NextRequest) => handle(request);

async function handle(request: NextRequest) {
  const name = request.nextUrl.pathname.split('/').pop() ?? '';
  const def = QUERY_REGISTRY[name];
  if (!def) {
    return NextResponse.json({ error: `Unknown query: ${name}` }, { status: 404 });
  }

  const inputParam = request.nextUrl.searchParams.get('input');
  let input: unknown;
  if (inputParam !== null) {
    try {
      input = JSON.parse(inputParam);
    } catch {
      return NextResponse.json({ error: 'Invalid input JSON' }, { status: 400 });
    }
  }

  // Validación zod (misma que la action)
  if (def.schema) {
    try {
      input = def.schema.parse(input ?? {});
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
      }
      throw error;
    }
  }

  return withRole(def.roles, async (_req, { session }) => {
    try {
      const data = await def.run(input, session.user.id);
      // Envelope compatible con lo que esperaban los queryFn de las actions
      return NextResponse.json(serializeDates({ data }));
    } catch (error) {
      console.error(`[/api/query/${name}]`, error);
      return NextResponse.json({ error: 'Error inesperado en el sistema.' }, { status: 500 });
    }
  })(request);
}
