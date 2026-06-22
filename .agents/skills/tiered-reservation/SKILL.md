---
name: tiered-reservation
displayName: Tiered Reservation System
description: Sistema escalonado de reserva de gift cards. Control de acceso por tiers, precios dinámicos según tasa del buyer, y escalamiento progresivo. Úsese al trabajar en el sistema de reserva, búsqueda de tarjetas, precios diferenciados por usuario, o lógica de acceso a inventario.
version: 1.0.0
---

# Tiered Reservation System - Sistema de Reserva Escalonado

Sistema de control de acceso a gift cards donde cada tarjeta tiene un `escalationTier` que determina qué buyers pueden comprarla según su tasa de compra.

---

## Concepto Central

### ¿Qué es el escalationTier?

El `escalationTier` es un número entero (ej: 85) que representa el **porcentaje mínimo de compra** que un buyer debe tener para acceder a una tarjeta.

```
Tarjeta con tier 85:
→ Solo buyers con buyRate >= 85% pueden comprarla
→ Buyer con 85% ✅ puede comprar
→ Buyer con 84% ❌ NO puede comprar
→ Buyer con 90% ✅ puede comprar
```

### ¿Qué significa "escalar"?

El tier **desciende** (baja) con el tiempo:

- Tier 85 → 84 → 83 → 82 → 81 → 80 → 79...
- Cada X minutos (configurable, ej: 5 min) el tier baja en una cantidad (ej: 1 punto)

```
A las 10:00 se publica una tarjeta → tier inicial = 85
  → Solo Buyer A (85%) puede comprarla

A las 10:05 → tier baja a 84
  → Buyer A (85%) y Buyer B (84%) pueden comprarla

A las 10:10 → tier baja a 83
  → Buyer A (85%), Buyer B (84%), Buyer C (83%) pueden comprarla

...y así sucesivamente hasta que el tier llega a un mínimo
```

### ¿Por qué "escalonado"?

Porque el sistema **prioriza** a los buyers que pagan más (%) al momento de publicar las tarjetas. Aquellos con mayores tasas tienen acceso exclusivo primero, y ese acceso se amplía progresivamente a medida que el tier baja.

---

## Modelo de Datos (Prisma Schema)

### Modelos Principales

```prisma
// Tarjeta individual
model Giftcard {
  id             String  @id @default(cuid())
  brandCountryId String
  amount         Decimal @db.Decimal(10, 2)  // Valor nominal

  // Sistema de reserva escalonado
  escalationTier Int      @default(100)  // Tier inicial al crear
  tierStartedAt  DateTime @default(now())
  tierUpdatedAt  DateTime @updatedAt

  inStock        Boolean        @default(true)  // false = reservada/comprada
  status         GiftcardStatus @default(UNUSED)

  // ...relaciones
}

// Tasas globales para brand/country
model BrandCountryRate {
  id             String       @id @default(cuid())
  brandCountryId String       @unique
  buyRate        Decimal      @db.Decimal(10, 4)  // ej: 0.85
  sellRate       Decimal      @db.Decimal(10, 4)
}

// Tasas personalizadas por usuario
model UserBrandCountryRate {
  id             String       @id @default(cuid())
  userId         String
  brandCountryId String
  buyRate        Decimal      @db.Decimal(10, 4)
  sellRate       Decimal      @db.Decimal(10, 4)

  @@unique([userId, brandCountryId])
}

// Usuario
model User {
  id                   String  @id @default(cuid())
  role                 Role    @default(BUYER)
  allowBuyRateAdjustment Boolean @default(false)  // Si puede ajustar su tasa

  // ...relaciones
}
```

### Enums Relevantes

```prisma
enum Role {
  ADMIN
  SELLER
  BUYER
}

enum GiftcardStatus {
  USED
  UNUSED
  ALREADY_USED
  INVALID
  DEACTIVATED
  WRONG_AMOUNT
}
```

---

## Cómo Funciona el Sistema

### 1. Creación de Tarjetas (Seller publica)

Cuando un seller publica un lote de tarjetas:

```
publish-batch.ts → getInitialTier(brandCountryId)
```

```typescript
// giftcard-escalation.ts:getInitialTier()
async getInitialTier(brandCountryId: string): Promise<number> {
  // Busca la máxima tasa entre UserBrandCountryRate
  const maxUserRate = await prisma.userBrandCountryRate.findFirst({
    where: { brandCountryId },
    orderBy: { buyRate: 'desc' },
  });

  if (maxUserRate && maxUserRate.buyRate.gt(0)) {
    return Math.floor(maxUserRate.buyRate.toNumber() * 100);
  }

  // Fallback: tasa global
  const defaultRate = await prisma.brandCountryRate.findUnique({...});
  if (defaultRate && defaultRate.buyRate.gt(0)) {
    return Math.floor(defaultRate.buyRate.toNumber() * 100);
  }

  return 100;  // Default si no hay nada configurado
}
```

**Lógica actual:**

- Si existe ALGUNA `UserBrandCountryRate` → usa la máxima de esas
- Si NO existe ninguna `UserBrandCountryRate` → usa la global
- Si tampoco hay global → usa 100

### 2. Búsqueda de Tarjetas (Buyer)

```typescript
// browse-giftcards.ts:findGiftcardCombination()
export function findGiftcardCombination(
  cards: Giftcard[],
  targetPurchaseAmount: number,
  buyerBuyRate: number, // ej: 85
  minAmount?: Decimal,
  maxAmount?: Decimal,
): GiftcardSelectionWithTierInfo {
  // Filtra solo tarjetas accesibles (tier <= buyerBuyRate)
  const accessibleCards = cards.filter((card) => {
    const tier = card.escalationTier;
    return tier <= buyerBuyRate; // 85 <= 85 = true, 86 <= 85 = false
  });

  const inaccessibleCards = cards.filter((card) => {
    const tier = card.escalationTier;
    return tier > buyerBuyRate;
  });
  // ...continúa con algoritmo de selección
}
```

### 3. Confirmación de Compra

```typescript
// create-order.ts:validateTierAccess()
function validateTierAccess(cards, buyerBuyRate): string | null {
  for (const card of cards) {
    const tier = card.escalationTier != null ? Number(card.escalationTier) : 100;
    if (tier > buyerBuyRate) {
      return `No puedes tomar ${blockedCards.length} tarjeta(s). Algunas cambiaron de tier.`;
    }
  }
  return null;
}
```

### 4. Escalamiento Automático (Job Cron)

```typescript
// giftcard-escalation.ts:processEscalationTiers()
async processEscalationTiers(): Promise<{ processed: number }> {
  // Obtiene config (durationMinutes, dropAmount)
  const config = await this.getConfig();

  // Para cada brandCountry, obtiene el tier mínimo
  const minTiersByBrandCountry = new Map<string, number>();
  for (const bc of brandCountries) {
    minTiersByBrandCountry.set(bc.id, await this.getMinTierForBrandCountry(bc.id));
  }

  // Busca tarjetas old enough para escalar
  const cutoffTime = new Date(Date.now() - config.durationMinutes * 60 * 1000);
  const cardsToEscalate = await prisma.giftcard.findMany({
    where: {
      inStock: true,
      status: 'UNUSED',
      tierStartedAt: { lte: cutoffTime },
    },
  });

  // Para cada tarjeta, baja el tier (pero nunca debajo del mínimo)
  for (const card of cardsToEscalate) {
    const minTier = minTiersByBrandCountry.get(card.brandCountryId) ?? 70;
    if (card.escalationTier > minTier) {
      const newTier = card.escalationTier - config.dropAmount;
      updates.push({ id: card.id, newTier: Math.max(newTier, minTier) });
    }
  }

  // Aplica todas las actualizaciones en una transacción
  await prisma.$transaction(updates.map(...));
}
```

---

## Tasas (Rates) - Sistema de Precios

### Tipos de Tasa

| Tipo          | Modelo                 | Descripción                                                |
| ------------- | ---------------------- | ---------------------------------------------------------- |
| Global        | `BrandCountryRate`     | Tasa por defecto para todos los buyers en un brand/country |
| Personalizada | `UserBrandCountryRate` | Tasa específica para un usuario en particular              |

### Cómo se Determina la Tasa de un Buyer

```typescript
// pricing.service.ts:getUserRates()
export async function getUserRates(userId, params) {
  // 1. Busca tasa personalizada del usuario
  const userRate = await prisma.userBrandCountryRate.findUnique({
    where: { userId_brandCountryId: { userId, brandCountryId } },
  });

  if (userRate) {
    return { buyRate: userRate.buyRate, sellRate: userRate.sellRate, isCustom: true };
  }

  // 2. Fallback: tasa global
  const globalRate = await prisma.brandCountryRate.findUnique({...});

  if (globalRate) {
    return { buyRate: globalRate.buyRate, sellRate: globalRate.sellRate, isCustom: false };
  }

  // 3. Error si no hay nada configurado
  throw new Error('You do not have a rate assigned for this brand and country. Contact the administrator.');
}
```

### Validación de Permisos

```typescript
// update-buy-rate.ts
const updateBuyRateInputSchema = z.object({
  brandCountryId: z.string(),
  buyRate: z.number().min(0.8).max(1.0), // Solo entre 80% y 100%
});

// El usuario solo puede ajustar si:
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { allowBuyRateAdjustment: true },
});

if (!user?.allowBuyRateAdjustment) {
  return { error: 'No tienes permiso para ajustar tu tarifa' };
}
```

---

## Reglas de Acceso

### Regla Fundamental

```
Un buyer puede comprar una tarjeta si:
  buyerBuyRate >= card.escalationTier

Ejemplos:
  buyerBuyRate = 85, tier = 85  → ✅ Acceso
  buyerBuyRate = 85, tier = 86  → ❌ Sin acceso
  buyerBuyRate = 90, tier = 85  → ✅ Acceso
  buyerBuyRate = 80, tier = 85  → ❌ Sin acceso
```

### Conversión de Tasas

Las tasas se almacenan como decimals (ej: `0.85`) pero se comparan como enteros (ej: `85`).

```typescript
// buyerBuyRate se calcula como:
const buyRate = rates.buyRate as Decimal;
const buyerBuyRate = Math.floor(buyRate.toNumber() * 100); // 0.85 → 85
```

---

## Edge Cases y Comportamientos

### Edge Case 1: Buyer sin tasa personalizada

```
Situación:
- Buyer A: UserBrandCountryRate = 0.85 (85%)
- Buyer B: Sin UserBrandCountryRate (usa global)
- Tarifa global: 0.80 (80%)

Comportamiento:
- Buyer A ve y compra con tier 85
- Buyer B usa la global (80%), pero las tarjetas están en tier 85
- Buyer B NO puede comprar hasta que el tier baje a 80

¿Esto es intencional? SÍ - el sistema da prioridad a buyers con mayor tasa
```

### Edge Case 2: Nueva tarjeta publicada

```
Situación:
- Ya existen tarjetas en tier 80
- Se registra un nuevo buyer con tasa 88%

Comportamiento:
- Las tarjetas nuevas se crean con tier basado en maxUserRate (88%)
- Las tarjetas existentes siguen en tier 80
- El nuevo buyer ve: tier 88 (nuevas) + tier 80 (viejas)
- Puede comprar de ambos grupos (88 >= 88 Y 80 <= 88)
```

### Edge Case 3: Admin actualiza tasa de usuario existente

```
Situación:
- Buyer A tiene UserBrandCountryRate = 0.80 (tier 80)
- Admin actualiza a 0.90 (tier 90)

Comportamiento:
- El cambio afecta búsquedas futuras
- Si Buyer A tiene tarjetas seleccionadas en sesión, validateTierAccess() las bloquea
- Buyer A recibe error: "Algunas cambiaron de tier. Por favor re-busca"
```

### Edge Case 4: Cambios entre búsqueda y confirmación

```
Situación:
1. Buyer busca y ve tarjetas disponibles (tier 85)
2. Entre búsqueda y confirmación, otra persona compra esas tarjetas
3. O el escalation job baja el tier de otras tarjetas

Comportamiento:
- create-order.ts valida el tier nuevamente
- Si alguna tarjeta cambió de tier, se rechaza la orden
- Mensaje: "No puedes tomar X tarjeta(s). Algunas cambiaron de tier."
```

### Edge Case 5: Tier mínimo

```
Situación:
- minTier = 80 (hardcoded fallback en getMinTierForBrandCountry)
- Una tarjeta llega a tier 80

Comportamiento:
- El tier se detiene en 80 por defecto
- processEscalationTiers usa Math.max(newTier, minTier)
```

### Edge Case 6: Tarjeta no comprada en tier mínimo → tier 0 (Acceso Universal)

```
Situación:
- Usuarios existentes: 89%, 85%, 83%
- Tarjeta llega a tier mínimo 83 y nadie la compra
- Se registra nuevo usuario con 80%

Comportamiento:
- Si la tarjeta permanece en tier 83 por 3 ciclos sin ser comprada
- El tier desciende a 0, haciéndola accesible para CUALQUIER buyer
- Timeout: 3 * escalation_duration_minutes (ej: 3 * 5min = 15 min en el mínimo)

Lógica en processEscalationTiers():
  if (card.escalationTier === minTier) {
    const timeInMinTier = Date.now() - card.tierStartedAt.getTime();
    const minTierTimeout = config.durationMinutes * 60 * 1000 * 3;
    if (timeInMinTier >= minTierTimeout) {
      const newTier = card.escalationTier - config.dropAmount;
      updates.push({ id: card.id, newTier: Math.max(newTier, 0) });
    }
  }

Importancia: Resuelve el bug donde usuarios con baja tasa (80%) no podían
acceder a tarjetas publicadas cuando no existían usuarios con esa tasa.
```

### Edge Case 7: Nuevo usuario con rate bajo vs tarjetas existentes

```
Situación:
- 3 usuarios publican tarjetas: 89%, 85%, 83%
- Se registra usuario D con 80%
- Las tarjetas existentes están en tier 83 (mínimo de usuarios existentes)

Comportamiento:
- Usuario D NO puede comprar las tarjetas existentes (83 > 80)
- Las tarjetas nuevas que se publiquen sí podrán descender hasta 80
- Las tarjetas existentes pueden bajar a 0 si no son compradas en 3 ciclos

Solución: El timeout de 3 ciclos permite que tarjetas no reclamadas
lleguen a tier 0, haciéndolas accesibles para cualquier buyer.
```

---

## Configuración

### PlatformSettings (Escalation)

```typescript
// Keys en platform_settings:
'escalation_enabled'; // boolean - si el sistema está activo
'escalation_duration'; // number  - minutos entre cada drop
'escalation_drop_amount'; // number  - puntos que baja el tier
```

### Valores por Defecto (Seed)

```typescript
// seed-data.ts
ESCALATION_ENABLED = true;
ESCALATION_DURATION_MINUTES = 5;
ESCALATION_DROP_AMOUNT = 1;
ESCALATION_MIN_TIER_FALLBACK = 80; // Fallback del tier mínimo
```

---

## Code References

### Servicios Principales

```
src/lib/services/giftcard-escalation.ts
├── getInitialTier(brandCountryId)         # Línea 23-44
├── getMinTierForBrandCountry(brandCountryId)  # Línea 46-67 (fallback 80)
├── processEscalationTiers()               # Línea 69-127 (incluye lógica tier 0)
├── getTierInfoForBuyer(buyerId, brandCountryId)  # Línea 129-179
└── canBuyerAccessTier(buyerBuyRate, cardTier)  # Línea 181-183
```

### Algoritmo de Búsqueda

```
src/lib/browse-giftcards.ts
├── findGiftcardCombination()              # Función principal, línea 62-171
├── preprocessCardsByBatches()             # Agrupación por lotes, línea 179-209
├── batchSequentialSelection()             # Estrategia 1, línea 217-286
├── selectFromBatchWithTolerance()        # Selección dentro de lote, línea 292-360
├── canMakeExactAmount()                   # DP check, línea 368-402
├── findExactInBatch()                     # DP implementation, línea 408-493
├── optimizeBatchSelection()               # Estrategia 2, línea 502-551
└── selectBestResult()                     # Compara resultados, línea 596-637
```

### Acciones Server

```
src/actions/buyer/orders/create-order.ts
├── validateTierAccess()                   # Línea 11-26
└── createOrder (action)                   # Línea 28-93

src/actions/buyer/giftcards/search-giftcards.ts
├── getBuyerBuyRate()                      # Línea 42-62
└── searchGiftcards (action)               # Línea 64-211

src/actions/buyer/preferences/update-buy-rate.ts
└── updateBuyRate (action)                 # Línea 13-63

src/actions/admin/users/update-user-rates.ts
└── updateUserRates (action)               # admin actualiza tasas

src/actions/admin/catalog/update-brand-country-rate.ts
└── updateBrandCountryRate (action)        # admin actualiza tasa global
```

### Bot Handlers (Telegram)

```
src/bot/buyer-bot/handlers/buy.handler.ts
├── startBuyWizard()                       # Step 1: seleccionar marca
├── handleBuyBrandSelected()              # Step 2: seleccionar país
├── handleBuyCountrySelected()             # Step 3: ingresar monto
├── handleAmountText()                     # Step 4: buscar y previsualizar
└── handleBuyConfirm()                     # Step 5: confirmar orden
```

### Publish Batch (Seller)

```
src/actions/seller/batches/publish-batch.ts
├── getInitialTier()                       # Usado en línea 145
└── Lógica de creación de tarjetas (línea 156-174)
```

---

## Bugs Corregidos

### Bug 1: getTierInfoForBuyer - Falta \*100

**Archivo:** `giftcard-escalation.ts:línea 143`

```typescript
// ❌ ANTES (incorrecto)
buyerBuyRate = Math.floor(userRate.buyRate.toNumber()); // 0.85 → 0

// ✅ CORREGIDO
buyerBuyRate = Math.floor(userRate.buyRate.toNumber() * 100); // 0.85 → 85
```

### Bug 2: getMinTierForBrandCountry - Inconsistencia en fallback

**Archivo:** `giftcard-escalation.ts:líneas 53-63`

```typescript
// ❌ ANTES (incorrecto)
return Math.floor(minUserRate.buyRate.toNumber()); // Sin *100
return Math.floor(defaultRate.buyRate.toNumber()); // Sin *100

// ✅ CORREGIDO
return Math.floor(minUserRate.buyRate.toNumber() * 100);
return Math.floor(defaultRate.buyRate.toNumber() * 100);
```

### Bug 3: Tier mínimo 70 hardcodeado - Usuarios con rate bajo no podían acceder

**Archivo:** `giftcard-escalation.ts:líneas 66 y 102`

**Problema:** El fallback del tier mínimo era 70, y la lógica no permitía descender más allá del mínimo de usuarios existentes. Si se publicaban tarjetas con usuarios al 89%, 85%, 83%, el mínimo era 83, y un usuario con 80% no podía comprar nunca esas tarjetas.

**Solución implementada:**

1. Fallback cambiado de 70 a 80
2. Nueva lógica: si una tarjeta está 3 ciclos en el tier mínimo sin ser comprada, puede descender a 0

```typescript
// ❌ ANTES
return 70;
if (card.escalationTier > minTier) {
  const newTier = card.escalationTier - config.dropAmount;
  updates.push({ id: card.id, newTier: Math.max(newTier, minTier) });
}

// ✅ CORREGIDO
return 80;
// Nueva lógica en processEscalationTiers:
} else if (card.escalationTier === minTier) {
  const timeInMinTier = Date.now() - card.tierStartedAt.getTime();
  const minTierTimeout = config.durationMinutes * 60 * 1000 * 3;
  if (timeInMinTier >= minTierTimeout) {
    const newTier = card.escalationTier - config.dropAmount;
    updates.push({ id: card.id, newTier: Math.max(newTier, 0) });
  }
}
```

**Regla:** Tier 0 = accesible para cualquier buyer (cualquier buyRate > 0 puede comprar)

---

## Limitaciones Conocidas

1. **Tiers no suben**: Las tarjetas nunca suben de tier aunque lleguen usuarios con mayor tasa. Si un usuario con 95% se registra después de que tarjetas fueron creadas en tier 85, esas tarjetas siguen en tier 85. El diseño intencional prioriza a los buyers que pagarían más al momento de publicación.

2. **Global rate ignorado si existe UserBrandCountryRate**: La lógica actual usa solo `UserBrandCountryRate` para calcular el tier inicial, ignorando la global aunque sea mayor. Esto puede causar que buyers sin personalizada (que usarían la global) no puedan acceder a tarjetas hasta que el tier baje lo suficiente.

3. **Rate entre búsqueda y confirmación**: Si el rate del usuario cambia entre que ve las tarjetas y confirma, puede recibir error. Esto es intencional - protege contra inconsistencias.

4. **Timeout de 3 ciclos hardcodeado**: El tiempo que una tarjeta debe permanecer en el tier mínimo antes de poder descender a 0 está fijo en 3 ciclos. No es configurable actualmente.

---

## Glosario

| Término                    | Significado                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `escalationTier`           | Entero que representa el % mínimo de buyRate para acceder a una tarjeta |
| `buyerBuyRate`             | Porcentaje que el buyer paga (ej: 0.85 = 85%)                           |
| Tier alto                  | Número alto (ej: 90) = más restrictivo, menos buyers pueden comprar     |
| Tier bajo                  | Número bajo (ej: 70) = más accesible, más buyers pueden comprar         |
| `getInitialTier()`         | Función que determina el tier inicial al crear una tarjeta              |
| `processEscalationTiers()` | Job que baja los tiers de tarjetas viejas                               |
| `BrandCountryRate`         | Tasa global para un brand/country específico                            |
| `UserBrandCountryRate`     | Tasa personalizada para un usuario en particular                        |

---

## Patrones de Uso

### Agregar nueva funcionalidad relacionada a tiers

1. Si necesitás filtrar tarjetas por tier: usar `findGiftcardCombination()` o replicar su lógica de `card.escalationTier <= buyerBuyRate`

2. Si necesitás validar acceso: usar `validateTierAccess()` o `canBuyerAccessTier()`

3. Si necesitás mostrar info de tiers: usar `getTierInfoForBuyer()`

4. Si necesitás el tier inicial para crear tarjetas: usar `escalationService.getInitialTier(brandCountryId)`

### Modificar tasas de buyers

- Para buyers: `updateBuyRate` (solo si `allowBuyRateAdjustment: true`)
- Para admin: `updateUserRates` (sin restricciones)

### Modificar tasa global

- Admin usa: `updateBrandCountryRate`

---

## Notas de Desarrollo

1. **Decimal precision**: Las tasas se almacenan como `Decimal(10,4)` para precisión. Siempre convertir a número y multiplicar por 100 antes de comparar con `escalationTier`.

2. **Transacciones**: `processEscalationTiers` usa `$transaction` para atomicidad, pero no bloquea tarjetas siendo usadas en órdenes activas.

3. **Sesiones del bot**: El wizard guarda `selectedGiftcardIds` en sesión para mantener la selección entre pasos.

4. **Credit limit**: El sistema de tiers es independiente del credit limit. Ambos se validan separately en la búsqueda.
