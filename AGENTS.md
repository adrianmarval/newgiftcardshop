# AGENTS.md — newgiftcardshop

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **DB**: PostgreSQL 17 + Prisma 7 (adapter-pg)
- **Auth**: Better Auth (email/password + Telegram linking)
- **Bots**: grammy (seller-bot + buyer-bot, webhooks en prod / polling en dev)
- **AI/OCR**: OpenRouter/Gemini para extracción de claim codes desde screenshots
- **Payments**: Binance Pay (integración pendiente — el buyer reporta TxID manualmente)
- **Email**: Resend

## Arquitectura

```
src/
├── app/(dashboard)/     # Páginas por rol: sell/, store/, admin/
├── actions/             # Server actions (next-safe-action)
│   ├── buyer/           # orders, giftcards, issues, preferences
│   ├── seller/          # batches (publish, list, check-codes)
│   ├── admin/           # payments, orders, batches, binance, users
│   ├── platform/        # settings (balance, binance pay id)
│   └── catalog/         # brands, countries (público)
├── bot/
│   ├── seller-bot/      # Bot de venta (grammy)
│   ├── buyer-bot/       # Bot de compra (grammy)
│   └── shared/          # middleware, ui, registration, formatters, types
├── components/
│   ├── buy/             # Wizard de compra web (5 steps)
│   ├── sell/            # Wizard de venta web (3 steps)
│   ├── admin/           # Dashboard admin
│   └── ui/              # shadcn/ui components
├── hooks/               # use-sell-flow, use-buy-flow (Zustand)
├── lib/
│   ├── services/        # giftcard-escalation, giftcard-reservation, pricing
│   ├── settings/        # settings.service (PlatformSettings)
│   ├── utils/           # claim-code-parser, action-helpers, encryption
│   └── encryption.ts    # AES-256-GCM (claimCode, pinCode, provenance images)
├── types/               # domain types (giftcard, sell validation)
└── generated/prisma/    # Prisma client generado
```

## Flujos principales

### Sell Flow (Web)

Wizard de 3 pasos: **Config** (brand+country) → **DataEntry** (paste de códigos + OCR) → **Review** (publicar).

- Hook principal: `src/hooks/use-sell-flow.ts` (Zustand, sin persist)
- Orchestrator: `src/components/sell/sell-flow-manager.tsx`
- Server action: `src/actions/seller/batches/publish-batch.ts`
- Parser: `src/lib/utils/claim-code-parser.ts` (formato: `CODE AMOUNT [PIN]` por línea)
- Claim codes: 14 o 15 chars alfanuméricos (NO 12 — el header del parser está mal)
- Dedup: `codeHash` es `@unique` GLOBAL — un claim code no puede repetirse entre brand-countries
- Validación server: monto > 0, claimCode no vacío. NO valida formato de claimCode ni minAmount/maxAmount (deuda)

### Buy Flow (Web)

Wizard de 5 pasos: **Search** (brand+country+monto) → **Results** (tarjetas encontradas) → **Redeem** (ver codes) → **ConfirmUsage** → **Payment**.

- Hook principal: `src/hooks/use-buy-flow.ts` (Zustand, sin persist)
- Orchestrator: `src/components/buy/buy-flow-manager.tsx`
- Búsqueda: `src/actions/buyer/giftcards/search-giftcards.ts` (subset-sum DP en `src/lib/browse-giftcards.ts`)
- Creación de orden: `src/actions/buyer/orders/create-order.ts` (con idempotencyKey + credit limit check en tx)
- Reservación: `src/lib/services/giftcard-reservation.service.ts` (compartido con bot)
- Pago: `src/actions/buyer/orders/complete-order.ts` (buyer reporta TxID, sin verificación automática aún)
- Crédito: buyer tiene `creditLimit`, se revalida dentro de la transacción de create-order
- Tiers: giftcards tienen `escalationTier` que baja con el tiempo (cron en server.ts) — buyer solo puede tomar cards con tier ≤ su buyRate

### Sell Flow (Telegram Seller Bot)

- Bot: `src/bot/seller-bot/index.ts` (grammy, sequentialize per-user, rate limit 30/3s)
- Handler principal: `src/bot/seller-bot/handlers/sell.handler.ts`
- Flujo: brand → country → codes (texto) → photos (opcional) → confirm → publish
- Fotos: guarda `telegramFileId` (NO descarga ni cifra — deuda técnica)
- NO usa `publish-batch.ts` — re-implementa la publicación inline (deuda: divergencia con web)
- Sesión: grammy PrismaAdapter, `getSessionKey: seller:${from.id}`

### Buy Flow (Telegram Buyer Bot)

- Bot: `src/bot/buyer-bot/index.ts` (grammy, sequentialize per-user, rate limit 30/3s)
- Handler principal: `src/bot/bot/buyer-bot/handlers/buy.handler.ts`
- Handlers de órdenes: `src/bot/buyer-bot/handlers/orders.handler.ts`
- Flujo: brand → country → monto → confirm → receive codes → confirm usage → payment
- Reservación: usa `reserveGiftcards` servicio compartido con web
- Status guards: `order.update` con `where: { status: 'EXPECTED' }` + catch P2025 en complete y confirmUsage
- Codes entregados ANTES del pago (intencional — modelo de crédito, buyer pasa por filtro manual)

## Modelo de datos clave

```prisma
Giftcard {
  claimCode: String (encrypted AES-256-GCM)
  codeHash: String? @unique (GLOBAL — no repetir entre brand-countries)
  pinCode: String? (encrypted)
  amount: Decimal(10,2)
  inStock: Boolean
  status: enum { UNUSED, USED, INVALID, ALREADY_USED, DEACTIVATED, WRONG_AMOUNT }
  orderId: String? (FK a Order, NO unique)
  brandCountryId: String?
  escalationTier: Int
  ownerId: String (seller)
}

Order {
  idempotencyKey: String? @unique
  status: enum { PENDING, AWAITING_PAYMENT, COMPLETED, CANCELLED }
  total: Decimal(10,2)
  adjustedTotal: Decimal? (post-redeem con issues)
  buyRate: Decimal(10,4)
  userId: String (buyer)
}

TelegramOtp {
  attempts: Int @default(0) (lockout a 5)
  otp: String (generado con crypto.randomInt, CSPRNG)
}
```

## Decisiones de negocio intencionales

1. **Pago sin verificación automática**: El buyer escribe un TxID y la orden pasa a COMPLETED. La verificación con API de Binance se implementará a futuro. El buyer pasa por un filtro manual del admin, se confía en él.
2. **Codes antes del pago**: Los claim codes se entregan inmediatamente al crear la orden (PENDING). El buyer los redime y paga después. Modelo de crédito.
3. **Cancelación NO restaura stock**: Solo se puede cancelar si todas las tarjetas están reportadas con saldo cero (INVALID, ALREADY_USED, DEACTIVATED, WRONG_AMOUNT=0). Las tarjetas malas no vuelven al stock.
4. **codeHash unique global**: Un claim code no debe existir en múltiples brand-countries. Si existe en US, no puede existir en UK.
5. **Fotos de evidencia del bot**: Se guarda solo `telegramFileId` (sin cifrar/descargar). Deuda técnica conocida.

## Seguridad

- **Webhook**: `secret_token` en `setWebhook` + verificación de header `X-Telegram-Bot-Api-Secret-Token`
- **Encryption**: AES-256-GCM con `ENCRYPTION_KEY` (64 hex chars). Sin versionado de keys (deuda).
- **OTP**: `crypto.randomInt` (CSPRNG) + lockout a 5 intentos
- **HTML escape**: `escapeHTML()` aplicado a todos los inputs dinámicos en mensajes Telegram `parse_mode:HTML`
- **Server actions**: `buyerActionClient`, `sellerActionClient`, `adminActionClient` separan autorización por rol
- **Balance de plataforma**: `updatePlatformBalance`/`getPlatformBalance` son `adminActionClient` (no `authActionClient`). Los callers internos usan `tx.platformSettings` directamente dentro de la transacción.

## Servicios compartidos

- `src/lib/services/giftcard-reservation.service.ts` — `reserveGiftcards(tx, ids, orderId)` con `updateMany` guardado por `inStock/status/orderId` + verificación de `count`. Usado por web y bot.
- `src/lib/services/pricing.service.ts` — `getUserRates(userId, { brandCountryId? | brandId+countryId })` retorna `{ buyRate, sellRate }`
- `src/lib/services/giftcard-escalation.ts` — cron que baja `escalationTier` de cards inactivas
- `src/lib/settings/settings.service.ts` — `SettingsService` con `getPlatformBalance()`, `updatePlatformBalance()`, escalation config

## Deuda técnica conocida (P2 — no urgente)

- Web sell `addImageToCard` es no-op (feature de evidencia en Review no funciona)
- Web sell no valida formato de claimCode server-side ni minAmount/maxAmount
- Web sell back-navigation destruye el batch (useEffect wipe en mount)
- Web sell sin persist (refresh = pérdida total)
- Seller bot duplica lógica de publish-batch en vez de invocar el action
- Seller bot fotos sin cifrar ni descargar
- `console.table` con claim codes en `data-entry-step.tsx` (secreto expuesto en consola)
- `sendOtpEmail` swallowa errores (dead catch blocks)
- Locks en memoria (`sequentialize`) inútiles en serverless multi-instancia
- Refactor pendiente: extraer `OrderService`, `PaymentService` compartidos bot+web

## Comandos útiles

```bash
npx tsc --noEmit          # Typecheck (limpio = OK)
npm run lint              # ESLint (77 errores pre-existentes, todos no-explicit-any en bots)
npx prisma db push --accept-data-loss  # Push schema a DB local
npx prisma generate       # Regenerar client
docker compose up -d database  # Levantar Postgres local (puerto 5444)
```
