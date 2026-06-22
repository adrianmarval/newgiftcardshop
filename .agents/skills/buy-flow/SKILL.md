---
name: buy-flow
displayName: Buy Flow
description: Sistema de compra de gift cards. Wizard de 5 pasos (Search, Results, Redeem, ConfirmUsage, Payment), reservación atómica con servicio compartido, idempotency key, credit limit revalidado en tx, tiers de escalación. Úsese al trabajar en el sistema de compra, órdenes, pagos, issues o acciones de buyer.
version: 1.0.0
---

# Buy Flow - Sistema de Compra de Gift Cards

Sistema completo para que buyers busquen, compren y paguen gift cards. Maneja búsqueda con subset-sum DP, reservación atómica, reporte de issues, y pago manual.

## Overview del Sistema

### Web (5 pasos)
1. **Search** (`search-step.tsx`): Brand + country + monto
2. **Results** (`results-step.tsx`): Tarjetas encontradas, confirmar orden
3. **Redeem** (`redeem-step.tsx`): Ver claim codes
4. **ConfirmUsage** (`confirm-usage-step.tsx`): Confirmar redención
5. **Payment** (`payment-step.tsx`): Reportar TxID de Binance

### Telegram Buyer Bot
1. `/buy` → brand → country → monto → confirm → receive codes → confirm usage → payment

---

## Archivos

```
src/hooks/use-buy-flow.ts              # Zustand store (sin persist)
src/components/buy/
├── buy-flow-manager.tsx               # Orchestrator del wizard
├── steps/
│   ├── search-step.tsx                # Step 1
│   ├── results-step.tsx               # Step 2 (crea orden con idempotencyKey)
│   ├── redeem-step.tsx                # Step 3
│   ├── confirm-usage-step.tsx         # Step 4
│   └── payment-step.tsx               # Step 5
src/actions/buyer/orders/
├── create-order.ts                    # Crear orden (idempotencyKey + credit limit en tx)
├── complete-order.ts                  # Completar orden (status guard + balance en tx)
├── cancel-order.ts                    # Cancelar (solo si todas cards saldo cero)
├── confirm-usage.ts                   # Confirmar uso (UNUSED → USED)
├── get-order-by-id.ts                 # Detalle de orden
├── get-order-cards.ts                 # Cards con claim codes descifrados
└── list-orders.ts                     # Lista de órdenes del buyer
src/actions/buyer/giftcards/
├── search-giftcards.ts                # Búsqueda (subset-sum DP)
└── issues/
    ├── report-issue.ts                # Reportar problema (valida giftcard.orderId)
    └── undo-issue.ts                  # Deshacer reporte
src/bot/buyer-bot/
├── index.ts                           # Bot setup (sequentialize, rate limit 30/3s)
├── handlers/buy.handler.ts            # Flujo de compra
└── handlers/orders.handler.ts         # Órdenes, issues, payment
src/lib/services/
├── giftcard-reservation.service.ts    # reserveGiftcards(tx, ids, orderId) — COMPARTIDO
├── pricing.service.ts                 # getUserRates
└── giftcard-escalation.ts             # Cron de tiers
src/lib/browse-giftcards.ts            # findGiftcardCombination (subset-sum DP)
```

---

## Reservación Atómica (CRÍTICO)

`src/lib/services/giftcard-reservation.service.ts` — **servicio compartido web + bot**

```typescript
export async function reserveGiftcards(
  tx: TransactionClient,
  giftcardIds: string[],
  orderId: string,
): Promise<void> {
  const result = await tx.giftcard.updateMany({
    where: {
      id: { in: giftcardIds },
      inStock: true,
      status: 'UNUSED',
      orderId: null,           // ← guard: no reconectar cards ya vendidas
    },
    data: {
      inStock: false,
      orderId,                 // ← setea orderId atómicamente
    },
  });
  if (result.count !== giftcardIds.length) {
    throw new GiftcardReservationError('Una o más tarjetas ya no están disponibles.');
  }
}
```

**NO usa `giftcards: { connect }`** — el `connect` de Prisma sobrescribe `orderId` sin validar. El `updateMany` con guard + verificación de `count` es atómico y seguro.

---

## Creación de Orden (Web)

`src/actions/buyer/orders/create-order.ts`:

1. `useValidated`: fetch giftcards con `inStock: true, status: 'UNUSED', orderId: null`
2. `.action`: fetch idempotency key → si existe, retornar orden existente
3. Fetch `buyRate` vía `getUserRates`
4. Validar tier access (`escalationTier ≤ buyerBuyRate`)
5. `$transaction`:
   - **Revalidar credit limit** atomically (unpaidTotal + newTotal ≤ creditLimit)
   - Crear orden con `idempotencyKey`
   - `reserveGiftcards(tx, ids, orderId)`

**Idempotency**: cliente genera `crypto.randomUUID()` en `useRef`, pasa al action. Si el mismo key llega dos veces, retorna la orden existente.

---

## Completar Orden (Pago)

`src/actions/buyer/orders/complete-order.ts` (web) + `handlePaymentText` (bot):

1. Status guard: `order.update({ where: { id, status: 'AWAITING_PAYMENT' } })` + catch P2025
2. Balance atómico: `tx.platformSettings.upsert` con `increment` **dentro de la tx**
3. Crea `Payment` con `balanceAfter` del balance actualizado
4. **NO verifica el TxID** contra Binance API (deuda intencional — se implementará a futuro)

**Sin status guard**: doble submit = dos `Payment` CREDIT + balance duplicado. El guard + P2025 previene esto.

---

## Cancelación

`src/actions/buyer/orders/cancel-order.ts`:

- **Solo se puede cancelar si TODAS las tarjetas tienen saldo cero**: `INVALID`, `ALREADY_USED`, `DEACTIVATED`, o `WRONG_AMOUNT` con `reportedAmount = 0`
- `hasActiveCards` bloquea si cualquier tarjeta tiene valor (`UNUSED`, `USED`, `WRONG_AMOUNT > 0`)
- **NO restaura `inStock`** ni libera `orderId` — las tarjetas malas no vuelven al stock
- Verifica `order.userId !== ctx.auth.user.id` (autorización)

---

## Reporte de Issues

`src/actions/buyer/giftcards/issues/report-issue.ts`:

- Valida `order.userId !== ctx.auth.user.id` (autorización)
- Valida `foundGiftcard.orderId !== orderId` (la giftcard pertenece a la orden)
- Tipos: `INVALID`, `ALREADY_USED`, `DEACTIVATED`, `WRONG_AMOUNT`
- `WRONG_AMOUNT` requiere `reportedAmount`
- Crea `GiftcardIssue` + actualiza `Giftcard.status` y `reportedAmount` en transacción

---

## Tiers de Escalación

- `Giftcard.escalationTier` (Int) — baja con el tiempo vía cron (`server.ts`)
- Buyer tiene `buyRate` (ej: 0.85 = 85%)
- `validateTierAccess`: buyer solo puede tomar cards con `escalationTier ≤ buyRate * 100`
- Cron: `GiftcardEscalationService.processEscalationTiers()` en `server.ts` (setInterval)
- **Deuda**: cron corre por proceso — multi-instancia double-process

---

## Búsqueda (Subset-Sum DP)

`src/lib/browse-giftcards.ts` — `findGiftcardCombination()`:

- DP sobre amounts floored a enteros
- Encuentra combinación de cards que suma ≥ target
- Filtra por tier access
- Respeta `minAmountPreference` / `maxAmountPreference` del buyer
- **Deuda**: retorna `total` floored, no la suma real de amounts

---

## Telegram Buyer Bot

### Setup (`index.ts`)
- `sequentialize((ctx) => 'buyer:${ctx.from.id}')` — serializa updates por user
- `limit({ timeFrame: 3000, limit: 30, onLimitExceeded })` — 10/s con toast "Calma, estás yendo muy rápido"
- Sesión: PrismaAdapter, `getSessionKey: buyer:${from.id}`

### Flujo (`buy.handler.ts`)
1. `startBuyWizard` — lista brands con stock
2. `handleBuyBrandSelected` — lista countries con stock
3. `handleBuyCountrySelected` — pide monto
4. `handleAmountText` — busca cards, verifica crédito, muestra preview
5. `handleBuyConfirm` — crea orden con `reserveGiftcards`, entrega codes inmediatamente
6. `handleConfirmUsageFinal` — status guard `PENDING` + catch P2025, pasa a `AWAITING_PAYMENT`
7. `handlePaymentText` — status guard `AWAITING_PAYMENT` + catch P2025, completa orden

### Codes antes del pago (intencional)
- Los claim codes se entregan en `handleBuyConfirm` (PENDING)
- El buyer los redime y paga después
- Modelo de crédito — el buyer pasa por filtro manual del admin

---

## HTML Escape (seguridad)

Todos los inputs dinámicos en mensajes `parse_mode:HTML` se escapan con `escapeHTML()`:
- Claim codes (seller → buyer trust boundary)
- PINs
- TxID del buyer
- brandName, countryName
- name, email en registration
- Errores del parser (incluyen input crudo del usuario)

---

## Modelo de datos

```prisma
Order {
  idempotencyKey: String? @unique   // generado con crypto.randomUUID()
  status: enum { PENDING, AWAITING_PAYMENT, COMPLETED, CANCELLED }
  total: Decimal(10,2)              // al crear
  adjustedTotal: Decimal?           // post-redeem con issues
  buyRate: Decimal(10,4)
  userId: String (buyer)
  brandCountryId: String?
}

Giftcard {
  orderId: String? (FK a Order, NO unique — manejado por reserveGiftcards)
  inStock: Boolean
  status: enum { UNUSED, USED, INVALID, ALREADY_USED, DEACTIVATED, WRONG_AMOUNT }
  reportedAmount: Decimal?          // seteado por report-issue
  escalationTier: Int
}

Payment {
  binanceTxId: String?              // NO unique (deuda: TxID reutilizable)
  balanceAfter: Decimal             // snapshot del balance post-operación
  direction: enum { CREDIT, DEBIT }
  category: enum { ORDER, DEPOSIT, REFUND_BUYER, REFUND_SELLER }
}
```

---

## Problemas conocidos (P2 — no urgente)

| Problema | Archivo | Descripción |
|----------|---------|-------------|
| `Payment.binanceTxId` no unique | `schema.prisma` | Mismo TxID reutilizable en múltiples payments |
| `listOrders` descifra todos los codes | `list-orders.ts:70-116` | Expone PII innecesariamente |
| `confirmUsage` fuerza UNUSED→USED | `confirm-usage.ts:35-47` | Inconsistencia con computeEffectiveTotalDecimal |
| `decrypt` catch devuelve ciphertext | `action-helpers.ts:81-94` | Si key rotada o tampered, devuelve ciphertext crudo |
| `findGiftcardCombination` floorea amounts | `browse-giftcards.ts:381` | total retornado es floored, no real |
| Buy flow sin persist | `use-buy-flow.ts` | Refresh = pérdida de estado (recover vía ?orderId=) |
| Cron escalación multi-instancia | `server.ts:25-34` | Cada proceso corre el cron |
