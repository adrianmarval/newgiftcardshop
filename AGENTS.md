# AGENTS.md — newgiftcardshop

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **DB**: PostgreSQL 17 + Prisma 7 (adapter-pg)
- **Auth**: Better Auth (email/password + passkeys/WebAuthn + Telegram linking)
- **Bots**: grammy (seller-bot + buyer-bot, webhooks en prod / polling en dev)
- **AI/OCR**: OpenRouter/Gemini para extracción de claim codes desde screenshots
- **Payments**: Binance Pay (integración pendiente — el buyer reporta TxID manualmente)
- **Email**: Resend

## Arquitectura

```
src/
├── app/(dashboard)/     # Páginas por rol: sell/, store/, admin/
├── actions/             # Server actions (next-safe-action)
│   ├── buyer/           # orders, giftcards, issues, preferences, stats, security (PIN gate)
│   ├── seller/          # batches (publish, list, check-codes), ocr, rates, stats
│   ├── admin/           # payments, orders, batches, issues (read-only + proof via BUYER_BOT_TOKEN), binance, users, catalog, stats
│   ├── auth/            # login, register, logout, forgot/reset password, verify email, passkey login guard
│   ├── catalog/         # brands, countries (público, read-only)
│   ├── notifications/   # notification CRUD
│   ├── platform/        # settings (balance, binance pay id)
│   ├── tours/           # onboarding tours (get-tours-seen, mark-tour-seen — authActionClient)
│   └── user/            # telegram profile photo
├── bot/
│   ├── seller-bot/      # Bot de venta (grammy)
│   ├── buyer-bot/       # Bot de compra (grammy)
│   └── shared/          # middleware, ui, registration, formatters, types
├── components/
│   ├── admin/           # Dashboard admin (batches, orders, payments, brands, users, config, charts)
│   ├── auth/            # Cross-cutting auth (login, register, profile, 2FA, passkey/)
│   ├── buy/             # Wizard de compra web (5 steps) + giftcard-orders
│   ├── common/          # Shared presentational components (stat-card, giftcard-item, etc.)
│   ├── emails/          # Resend email templates
│   ├── layout/          # Dashboard layout, sidebar, topbar
│   ├── notifications/   # Cross-portal notifications
│   ├── sell/            # Wizard de venta web (3 steps) + giftcard-batches
│   └── ui/              # shadcn/ui primitives
├── hooks/               # use-sell-flow, use-buy-flow (Zustand), use-tour (driver.js)
├── providers/           # React context providers (notifications, auto-refresh)
├── lib/
│   ├── auth/            # Server auth (better-auth), client auth, authorization helpers
│   ├── config/          # UI config (status colors, labels for domain enums)
│   ├── notifications/   # Notification subsystem (dispatcher, channels)
│   ├── tour/            # Onboarding tours driver.js (constants, seller/buyer steps)
│   ├── search-params/   # URL search param parsers (nuqs)
│   ├── services/        # Business logic shared between web, bot, and actions
│   ├── settings/        # settings.service (PlatformSettings)
│   ├── ui/              # Tailwind utils (cn), SweetAlert, theme utils
│   ├── utils/           # Pure utility functions (claim-code-parser, clipboard, etc.)
│   ├── constants.ts     # Domain constants (MAX_BATCH_SIZE, AVAILABLE_GIFTCARD_WHERE)
│   ├── encryption.ts    # AES-256-GCM (claimCode, pinCode, provenance images)
│   ├── image-utils.ts   # Image processing
│   ├── prisma.ts        # Prisma client instance
│   ├── resend.ts        # Resend email client
│   ├── safe-action.ts   # Action clients (auth, buyer, seller, admin)
│   ├── ai-providers.ts  # AI/OCR provider config
├── types/               # Centralized domain + application types
│   ├── domain/          # Entity types (giftcard, order, batch, brand-country, payment, escalation)
│   ├── application/     # Pagination, AppSection
│   ├── auth/            # Session types
│   ├── sell-flow.ts     # Sell wizard types
│   ├── buy-flow.ts      # Buy wizard types
│   ├── services.ts      # Service interface contracts
│   ├── notifications.ts # Notification types
│   └── binance.ts       # Binance API types
└── generated/prisma/    # Prisma client generado
```

### Convenciones de organización

- **Actions**: organizadas por rol (`buyer/`, `seller/`, `admin/`), con subdominios por entidad. Barrel `index.ts` en cada subdirectorio.
- **Components**: organizados por feature/portal. `ui/` solo para primitives shadcn.
- **Types**: centralizados en `@/types`. Tipos co-located en componentes solo para Props locales.
- **Lib**: infraestructura compartida. `auth/` para auth server/client/authorization, `services/` para lógica de negocio, `ui/` para utilidades de presentación (cn, Swal), `utils/` para funciones puras.
- **Barrel imports**: TODO se importa via barrel (`@/lib/ui`, `@/lib/settings`, `@/lib/notifications`, `@/lib/search-params`, `@/types`, `@/components/layout`). NUNCA se importa directamente de archivos individuales dentro de un subdirectorio con barrel.
- **Prompts al usuario**: Cualquier pregunta/opt-in al usuario (activar notificaciones, consentimientos) usa `PromptDrawer` (`@/components/common`, adaptativo: Drawer bottom en mobile / Dialog centrado en desktop via `useIsMobile`), NO toasts improvisados. Ejemplo: `components/notifications/push-prompt-drawer.tsx`.
- **Alertas imperativas**: `showAlert` (`@/lib/ui`) es la ÚNICA puerta para avisos/confirmaciones imperativas — SweetAlert está PROHIBIDO (dependencia removida). Bloqueantes (`success/error/warning/info/confirm`/`custom`) → cola zustand (`lib/ui/alert-store.ts`) renderizada por `AppAlertHost` (montado en root layout, adaptativo Drawer/Dialog). Toasts (`showAlert.toast.*`) → sonner. `confirm()` retorna `Promise<boolean>` y acepta `{ confirmText, cancelText, danger }`; `custom()` acepta contenido JSX (reemplaza el viejo `html:` de Swal).
- **Barrels NO re-exportan server-only**: Los barrels NO deben re-exportar módulos que dependan de `next/headers`, `next/navigation`, Prisma, u otras APIs server-only. Si un Client Component importa del barrel, webpack intentará empaquetar todo incluyendo código server. Los exports server-only (`getSession`, `authorizeByRequiredRole`, `settingsService`, `getServerTheme`) se importan directamente del archivo específico.
- **File naming**: kebab-case universal para archivos. PascalCase para componentes y interfaces.
- **Onboarding tours (driver.js)**: Micro-tours por página (máx 5 pasos), NO un tour gigante. Definiciones en `src/lib/tour/` (`seller-tours.ts` EN / `buyer-tours.ts` ES neutro — mismo idioma que la UI del portal), ids en `tour.constants.ts` (`sell-dashboard`, `sell-wizard`, `sell-batches`, `buy-dashboard`, `buy-wizard`, `buy-orders`). Persistencia cross-device en `User.toursSeen` (JSON string[]) via `actions/tours` (`getToursSeen`/`markTourSeen` — append idempotente; skipear también marca como visto). Mounting: `TopbarTourButton` (`@/components/common`) vive en el topbar (`app-top-bar.tsx`, entre la campana y el theme toggle) y mapea `usePathname()` → tourId (`ROUTE_TOURS`, match exacto); `seen` se consulta client-side via `getToursSeen()` al montar. **Auto-start SIN drawer**: en la primera visita el tour arranca directo tras ~1.2s (patrón de apps profesionales — ESC o la X lo cierran y marcan visto), esperando hasta 30s a que no haya ningún `[role="dialog"]` abierto para NO interferir con el prompt de activar notificaciones push; solo arranca si las anclas existen en el DOM (ej. sell-wizard no arranca si el wizard está bloqueado por falta de wallet). El botón `?` siempre permite replay manual. Anclas: atributos `data-tour="..."` en contenedores estables (NUNCA clases Tailwind). Theming: `.driver-popover.app-tour` en globals.css **FUERA de @layer** (driver.css carga sin capa y ganaría a cualquier regla layerada). Para agregar un tour: id nuevo en `TOUR_IDS` + steps + entrada en `ROUTE_TOURS`/`TOUR_REGISTRY` de `topbar-tour-button.tsx`. **Tours con cards expandibles** (batches/orders): el ancla va en la PRIMERA card via closure en `renderItem` (`data-tour={item.id === items[0]?.id ? ... : undefined}` — no tocar RegistryList/RegistryCard); el step de la card usa `skipMissingElement: true` + `onHighlightStarted` que hace `.click()` en `[data-tour="X-card"] [id^="registry-card-"]` para expandirla (idempotente: solo si `[data-tour="X-details"]` no existe), el step de detalles usa `skipMissingElement: true` + `waitForElement: 4000` (MutationObserver de driver espera al render async), y el último step la colapsa en `onHighlightStarted` para restaurar la lista (RegistryList filtra a solo la expandida). El ancla de detalles envuelve TODAS las ramas (ej. UnlockGate cuando `codesLocked`).

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
- Búsqueda: `src/actions/buyer/giftcards/search-giftcards.ts` (subset-sum DP en `src/lib/services/browse-giftcards.service.ts`)
- Creación de orden: `src/actions/buyer/orders/create-order.ts` (con idempotencyKey + credit limit check en tx)
- Reservación: `src/lib/services/giftcard-reservation.service.ts` (compartido con bot)
- Pago: `src/actions/buyer/orders/complete-order.ts` (buyer reporta TxID, sin verificación automática aún)
- Crédito: buyer tiene `creditLimit`, se revalida dentro de la transacción de create-order
- Tiers: giftcards tienen `escalationTier` que baja con el tiempo (cron en server.ts) — buyer solo puede tomar cards con tier ≤ su buyRate
- Cancelación auto: `confirmOrderUsage` y `cancelOrder` en `order-lifecycle.service.ts` auto-cancelan batches elegibles (payable=0, all confirmed) + notifican al seller

### Sell Flow (Telegram Seller Bot)

- Bot: `src/bot/seller-bot/index.ts` (grammy, sequentialize per-user, rate limit 30/3s)
- Handler principal: `src/bot/seller-bot/handlers/sell-handler.ts`
- Flujo: brand → country → codes (texto) → photos (opcional) → confirm → publish
- Fotos: guarda `telegramFileId` (NO descarga ni cifra — deuda técnica)
- Publica vía servicio compartido `publish.service.ts` (mismo core que web). Lógica bot-específica: reasignación de fotos temp, sesión, UI
- Sesión: grammy PrismaAdapter, `getSessionKey: seller:${from.id}`

### Buy Flow (Telegram Buyer Bot)

- Bot: `src/bot/buyer-bot/index.ts` (grammy, sequentialize per-user, rate limit 30/3s)
- Handler principal: `src/bot/buyer-bot/handlers/buy-handler.ts`
- Handlers de órdenes: `src/bot/buyer-bot/handlers/orders-handler.ts`
- Flujo: brand → country → monto → confirm → receive codes → confirm usage → payment
- Reservación: usa `reserveGiftcards` servicio compartido con web
- Status guards: `order.update` con `where: { status: 'EXPECTED' }` + catch P2025 en complete y confirmUsage
- Codes entregados ANTES del pago (intencional — modelo de crédito, buyer pasa por filtro manual)

### Web Claim (usuarios migrados: Telegram → Web)

Usuarios migrados del sistema viejo (`scripts/migrate-full.ts`) tienen email sintético `tg_<telegramId>@legacy.migrated` (constante `LEGACY_EMAIL_DOMAIN` en `lib/constants.ts`), sin password — el bot les funciona pero la web no. El claim self-service les activa el acceso web desde el bot:

- Módulo: `src/bot/shared/web-claim.ts` (compartido por ambos bots). Entry: botón `claim_web_start` en el menú principal — solo se renderiza si `hasLegacyEmail(user.email)` (en "🌐 Activate Web Access" seller / es "🌐 Activar acceso web" buyer); tras el claim el botón se transforma en un acceso directo URL permanente al panel web (`🌐 Open Web App` → `/sell/dashboard` / `🌐 Abrir app web` → `/store/dashboard`, via `NEXT_PUBLIC_APP_URL`; se omite si la env var no está definida).
- Flujo: `awaitingClaimEmail` (valida formato + email no usado por OTRO user) → `awaitingClaimOtp` (OTP CSPRNG por email, reusa `TelegramOtp` + lockout 5 via `verifyTelegramOtp`) → `awaitingClaimPassword` (tx: `user.update({email, emailVerified:true})` + `account.create` credential con hash de `auth.$context.password.hash` — mismo hashing que `signUpEmail`).
- Los steps del claim son post-auth (NO están en `REG_WIZARD_STEPS` — esos skipean el middleware de auth porque el registro es para usuarios sin cuenta; el claim requiere `ctx.user.id`).
- Edge: email ya registrado por otro user (se registró en web antes de claimear) → error + contacto admin (merge manual, no automático). P2002 en el tx = race de email, se reintenta desde el paso de email.

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

PinResetOtp {
  userId: String @unique
  otp: String (CSPRNG, expira 10min, lockout a 5)
}

User {
  securityPinHash: String? (scrypt salt:hash — PIN 4-6 dígitos del buyer)
  pinFailedAttempts: Int @default(0) (lockout a 5 → pinLocked)
  pinLocked: Boolean @default(false)
  securityUnlockedUntil: DateTime? (ventana de reveal, 10min cross-canal)
}
```

## PWA — 3 apps instalables (sell, buy, admin)

La app se instala como 3 PWAs separadas para cada panel, con identidad aislada. **NUNCA usar `src/app/manifest.ts`** — la convención de archivo sobreescribe `metadata.manifest` en layouts hijos (verificado en source de Next 16), rompiendo el aislamiento por panel.

- **Manifests estáticos**: `public/manifests/{sell,buy,admin}.webmanifest` — cada uno con `id` estable (misma ruta que el dashboard), `scope` por sección, iconos 192/512, `display: standalone`. **Sin shortcuts** (fuga de información entre roles — los sellers no deben saber que existe el panel de buyers).
- **Enlace por ruta**: root layout usa `manifest: '/manifests/sell.webmanifest'` (landing es sell-facing). `(auth)/[portal]/auth/layout.tsx` usa `generateMetadata` con `MANIFEST_MAP[portal]`. Los 3 `dashboard/layout.tsx` exportan `metadata.manifest`.
- **Identidad estable por id**: Chrome identifica la PWA por `id` del manifest. Si cambias el id, las instalaciones existentes se invalidan. Mantener ids como `/sell/dashboard`, `/store/dashboard`, `/admin/dashboard`.
- **Observaciones**: SW sin fetch handler (OK en Chrome 108+, el requisito se eliminó). Iconos maskable pendientes (requiere assets con safe zone real). iOS no soporta `beforeinstallprompt`.

## Decisiones de negocio intencionales

1. **Pago sin verificación automática**: El buyer escribe un TxID y la orden pasa a COMPLETED. La verificación con API de Binance se implementará a futuro. El buyer pasa por un filtro manual del admin, se confía en él.
2. **Codes antes del pago**: Los claim codes se entregan inmediatamente al crear la orden (PENDING). El buyer los redime y paga después. Modelo de crédito.
3. **Cancelación automática de batches**: Un batch se auto-cancela cuando su monto a pagar es 0 (todas las tarjetas reportadas con saldo cero) Y todas sus cards están confirmadas (`isConfirmed`). Trigger: evento (`confirmOrderUsage`/`cancelOrder` en `order-lifecycle.service.ts`) + cron safety net (15min en `server.ts`). La guarda `isConfirmed` garantiza que los reportes son irreversibles antes de cancelar. Reutiliza `notifySellerBatchCancelled` existente.
4. **codeHash unique global**: Un claim code no debe existir en múltiples brand-countries. Si existe en US, no puede existir en UK.
5. **Fotos de evidencia del bot**: Se guarda solo `telegramFileId` (sin cifrar/descargar). Deuda técnica conocida.
6. **Passkeys**: Plugin `@better-auth/passkey` (pineado a 1.5.6, matchea better-auth core — NO usar `^` en la versión, un minor más nuevo exige core más nuevo). `signIn.passkey` bypasea la action `login`, por eso existe `actions/auth/complete-passkey-login.ts` que revalida la guarda rol/portal server-side (sin ella, un BUYER con passkey entraría al portal sell). El sign-in con passkey NO pide TOTP aunque el usuario tenga 2FA activo (comportamiento del plugin — la passkey ya es factor fuerte: posesión + biometría). Prompt de registro post-login: vista intersticial dedicada `/[portal]/auth/setup-passkey` (page server self-guarding: sin sesión/con passkeys/dismissed → redirect; `PasskeySetupView` client). La action `login` decide el redirect (passkey count + cookie `passkey_setup_done`, definida en `lib/constants.ts`, seteada client-side vía `markPasskeySetupDone`); el flujo 2FA aterriza ahí siempre y la página rebota al dashboard si no aplica. Conditional UI (autofill) activa en el campo email del login (`autocomplete="username webauthn"`). WebAuthn no funciona en iframes cross-origin (Telegram WebView) — la UI de passkey se auto-oculta si `PublicKeyCredential` no está disponible.
   - **Ceremonia de autenticación propia**: NO usamos `authClient.signIn.passkey()` — el wrapper del plugin hace `console.error` incondicional en cualquier excepción, incluida la cancelación del usuario (ruido rojo en consola al cancelar). `use-passkey-sign-in.ts` implementa la ceremonia con `@simplewebauthn/browser` directo (mismos endpoints `/passkey/generate-authenticate-options` + `/passkey/verify-authentication` vía `authClient.$fetch` — el atomListener `$sessionSignal` refresca la sesión igual). Cancelaciones (`ERROR_CEREMONY_ABORTED`, `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`/NotAllowedError) se tragan en silencio. El lado de registro (`addPasskey`) SÍ es limpio y se usa el wrapper del plugin. La misma ceremonia está extraída en `runPasskeyAuthentication()` (`passkey-utils.ts`) para re-autenticación dentro de sesión (gate de códigos). **OJO**: `verify-authentication` responde `{ session }` — NO incluye `user` aunque el OpenAPI del plugin diga lo contrario; el userId sale de `session.userId`.
7. **Gate de seguridad para revelar códigos (anti-hurto)**: Los claim codes solo salen del servidor/bot si la orden NO tiene cards sin confirmar (`isConfirmed=false` ⇒ códigos aún aplicables y robables) O el buyer tiene un unlock vigente (`securityUnlockedUntil`, 10 min, cross-canal web+bot). El gate vive en el REVEAL, no en la creación de la orden (cero fricción en el flujo de compra). Es OBLIGATORIO al primer reveal: buyer sin PIN ni passkey debe crear un PIN inline antes de ver códigos. Puntos gateados: `getOrderCards` (redeem step), `getOrderById` (detalle/resume), `listOrders` (masked `••••••••` + flag `codesLocked`, solo scope buyer — admin nunca se enmascara), reveal post-creación y `order_detail` del buyer-bot. Web prioriza passkey (si hay + WebAuthn soportado) con fallback a PIN; Telegram solo PIN (no hay WebAuthn en el bot). Servicio compartido: `lib/services/security/security-pin.service.ts`. UI web: `components/buy/security/unlock-gate.tsx` + sección en perfil. Bot: `bot/buyer-bot/handlers/security-handler.ts` (wizard steps `awaitingSecurityPin`/`awaitingPinSetup*`/`awaitingPinReset*`/`awaitingPinChange*`, borra los mensajes con PIN/OTP vía `deleteUserInput`). Recuperación en ambos canales: OTP por email (`PinResetOtp` + template `pin-reset-otp.tsx`; `requestPinReset` NO swallowa errores a diferencia de `sendOtpEmail`). Lockout: 5 intentos fallidos → `pinLocked`, solo se recupera por email OTP.
8. **Pago automático a sellers (`auto_pay_sellers`)**: Cuando el setting está en `true` (default `false`, toggle en admin config), los batches que quedan fully-confirmed con monto pagadero > 0 se pagan automáticamente vía `executeSellerPayout`. Trigger: evento post-commit (`triggerAutoPayForOrder` en `confirmOrderUsage`/`cancelOrder`, fire-and-forget) + cron safety net (5min en `server.ts`, mismo ciclo corre `syncPendingSellerPayments` — resuelve PENDINGs sin clic manual). Elegibilidad: `isPaid=false`, `cancelledAt=null`, todas las cards `isConfirmed`, `canCancelBatch=false` (payable=0 es territorio del auto-cancel — son mutuamente excluyentes). **Seller sin wallet**: se notifica a seller + admin en el evento; el sweep lo excluye hasta que configure método de pago (entonces entra solo al siguiente ciclo). **Fallos = retry MANUAL**: el sweep solo toma batches SIN ningún Payment BATCH/DEBIT previo (primer intento) — un payout fallido alerta al admin (`notifyAdminPayoutFailed`) y se reintenta desde la UI. `executeSellerPayout(batchId, source)` con `source='auto'` dispara las alertas; `'manual'` no (el admin ya ve el error). Guards en el payout: tx Serializable + `isPaid` + Payment activo por batch + guard de balance (nunca decrementa si `platformBalance < payoutAmount`) + `withdrawOrderId` único por intento (`BATCH_<id>_<n>` — un retry tras FAILED nunca colisiona con la clave de idempotencia previa de Binance). El sync también alerta al admin si un pago aceptado por Binance falla después (status 1/3/5). Notificaciones al seller en 2 etapas: `notifySellerBatchPayoutSent` al enviar a Binance (feedback inmediato, aplica a payouts manuales y automáticos) y `notifySellerBatchPaid` cuando el sync confirma (status 6). Servicio: `lib/services/payment/auto-pay.service.ts`.

## Seguridad

- **Protección de rutas — 3 capas**: (1) `src/proxy.ts` (convención Next 16, ex-middleware) hace check OPTIMISTA de presencia de cookie `better-auth.session_token`/`__Secure-better-auth.session_token` → sin cookie en rutas protegidas (dashboards + `/pending-activation`) redirige al login del portal sin renderizar; también inyecta `x-current-path` para `unauthorized.tsx`. NUNCA validar sesión en proxy (sin DB). (2) Guards REALES en layouts dashboard via `authorizeByRequiredRole` (matriz: admin=`[ADMIN]`, sell=`[SELLER,ADMIN]`, buy=`[ADMIN,BUYER]`). (3) Server actions via role clients. **Convención obligatoria**: toda página dashboard que lea `prisma` directo DEBE llamar `getSession`/`authorizeByRequiredRole` — los layouts NO se re-ejecutan en soft-nav entre páginas hermanas, la data nunca puede depender solo del layout.
- **Páginas auth públicas con sesión activa**: `login`, `register`, `forgot-password`, `reset-password` llaman `redirectIfAuthenticated()` (`lib/auth/authorization.ts`) — con sesión vigente redirige al dashboard del ROL del usuario (sesión única, no permite re-login ni switch de portal; inactivos → `/pending-activation`). NO aplicar en `verify-2fa` (sin sesión durante el desafío TOTP), `setup-passkey` (requiere sesión — loop) ni `verify-email` (intersticial post-registro).
- **Webhook**: `secret_token` en `setWebhook` + verificación de header `X-Telegram-Bot-Api-Secret-Token`
- **Encryption**: AES-256-GCM con `ENCRYPTION_KEY` (64 hex chars). Sin versionado de keys (deuda).
- **OTP**: `crypto.randomInt` (CSPRNG) + lockout a 5 intentos
- **HTML escape**: `escapeHTML()` aplicado a todos los inputs dinámicos en mensajes Telegram `parse_mode:HTML`
- **Server actions**: `buyerActionClient`, `sellerActionClient`, `adminActionClient` separan autorización por rol
- **Balance de plataforma**: `updatePlatformBalance`/`getPlatformBalance` son `adminActionClient` (no `authActionClient`). Los callers internos usan `tx.platformSettings` directamente dentro de la transacción.

## Servicios compartidos

- `src/lib/services/security/security-pin.service.ts` — `orderNeedsSecurityGate`, `isSecurityUnlocked`, `grantSecurityUnlock`, `verifySecurityPin`/`verifyPinAndUnlock` (lockout a 5), `setSecurityPin`/`changeSecurityPin`, `requestPinReset`/`confirmPinReset` (OTP email). Compartido web + buyer-bot.
- `src/lib/services/giftcard/batch-cancel.service.ts` — `canCancelBatch`, `cancelBatch`, `autoCancelEligibleBatchesForOrder(tx, orderId)` (evento), `sweepCancellableBatches()` (cron). Guards: `isPaid=false`, `cancelledAt=null`, todas las cards `isConfirmed`, `canCancelBatch`.
- `src/lib/services/payment/auto-pay.service.ts` — `triggerAutoPayForOrder(orderId)` (evento post-commit, no-op si flag off), `sweepPayableBatches()` (cron 5min, solo primer intento). Ver decisión #8.
- `src/lib/services/payment/seller-payout.service.ts` — `executeSellerPayout(batchId, source?)` (pago atómico vía Binance + revert en fallo + guard de balance + alertas admin cuando `source='auto'`), `syncPendingSellerPayments()` (resuelve PENDINGs contra Binance; cron 5min + botón manual admin).
- `src/lib/services/giftcard-reservation.service.ts` — `reserveGiftcards(tx, ids, orderId)` con `updateMany` guardado por `inStock/status/orderId` + verificación de `count`. Usado por web y bot.
- `src/lib/services/pricing.service.ts` — `getUserRates(userId, { brandCountryId? | brandId+countryId })` retorna `{ buyRate, sellRate }`
- `src/lib/services/giftcard-escalation.service.ts` — cron que baja `escalationTier` de cards inactivas
- `src/lib/settings/settings.service.ts` — `SettingsService` con `getPlatformBalance()`, `updatePlatformBalance()`, escalation config

## Notificaciones — canales

El `NotificationDispatcher` (`src/lib/notifications/dispatcher.ts`) despacha por `userId` a estos canales:

- **In-app**: persiste en `Notification`; el dashboard hace polling con `router.refresh()` cada 15s (`AutoRefreshProvider`)
- **Telegram**: elige bot por rol (BUYER/ADMIN → buyer-bot, resto → seller-bot). Con `NOTIFICATIONS_TOPIC_ENABLED=true` y topic mode habilitado en @BotFather, las notificaciones se envían a un topic dedicado "🔔 Notificaciones" (forum topic mode en chats privados, Bot API 10.x). El topic se crea lazy por usuario y se persiste en `TelegramUser.notificationTopicId`. Si el usuario lo borra, se recrea automáticamente; si lo cierra, se reabre vía `reopenForumTopic`. Si el bot no tiene topic mode, fallback a mensaje plano (cache en memoria 1h para no spamear la API). Servicio: `telegram-topics.ts`. Simétricamente, los flujos interactivos van al topic "🤖 Menú": `renderUI` (`bot/shared/ui.ts`) resuelve el thread vía `resolveFlowThreadId` (sesión → `TelegramUser.flowTopicId` → creación lazy solo para usuarios vinculados con `TelegramUser` row; el wizard de registro renderiza en General para evitar duplicados) y pasa `message_thread_id` en los mensajes nuevos (los edits van por messageId y no lo necesitan). El topic General queda vacío — `hideGeneralForumTopic` NO funciona en chats privados (requiere admin en supergrupo).
  - **INVARIANTE — topic ids son por (bot, chat)**: `message_thread_id` es una secuencia independiente por chat. Un id persistido solo es válido si el `chatId` persistido junto a él (`TelegramUser.flowChatId` / `notificationChatId`, String porque los chat ids exceden Int32) coincide con el chat actual. Esto protege contra: cambio de rol (buyer-bot ↔ seller-bot via `admin/users/update-user`), ADMIN usando ambos bots (los middlewares los aceptan), y el bot agregado a un grupo (`resolveFlowThreadId` retorna `undefined` si `chat.type !== 'private'`). Siempre persistir y validar el chatId junto al topicId.
  - **Anti-duplicados**: la creación usa claim atómico (`updateMany where field is null or chatId distinto`) — si dos procesos/instancias crean el topic concurrentemente, el perdedor borra su topic huérfano (`deleteForumTopic`) y adopta el del ganador. Los locks en memoria (`sequentialize`) NO bastan en multi-instancia. Solo se crean topics para usuarios vinculados (con `TelegramUser` row); el wizard de registro renderiza en General para evitar duplicados cuando Telegram reenvía updates o hay multi-instancia.
  - **Guard anti-service-messages**: los service messages generados por el propio bot (ej. `forum_topic_created` al crear un topic) son entregados por Telegram al bot. Sin el guard, authenticateBuyer/authenticateSeller los procesa como si fueran de un usuario no vinculado y renderiza "Tu cuenta no está vinculada" en el chat. El guard (`ctx.from?.id === botId`) está ANTES de session en ambos bots para no persistir filas basura en `bot_session`. Ver: commit previo / bug report "segundo mensaje no vinculada".
  - **Fallback final**: si los reintentos con thread fallan (borrado+cierre en ráfaga, recreación fallida), `renderUI` y el canal de notificaciones envían mensaje plano a General — el usuario NUNCA se queda sin UI por culpa de un topic.
  - **Detección de topic inválido**: `isTopicGoneError` matchea `thread not found` (borrado) y `topic closed` (cerrado, case-insensitive). Los usuarios no generan evento al borrar topics — la detección es lazy, al fallar el envío.
- **Web Push**: `WebPushChannel` (`channels/webpush.channel.ts`) con Push API + VAPID. Suscripciones en `PushSubscription` (endpoint `@unique`, varios dispositivos por user), toggle `pushEnabled` en `NotificationPreference`. SW en `public/sw.js`, registrado silenciosamente por `NotificationProvider`. Hook `src/hooks/use-push-subscription.ts` + server actions `save-push-subscription`/`delete-push-subscription`/`send-test-push` (botón "Probar" en settings — bypass del dispatcher, solo canal push). El canal loguea `sent` (con counts) y `skipped` (con reason) a `app_log`; el dispatcher solo loguea `failed`. Endpoints muertos (404/410) se auto-eliminan. Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. En iOS requiere la PWA instalada (16.4+). Brave requiere "Google services for push messaging" habilitado (el hook detecta el fallo y devuelve `brave_push_service_disabled`).

## Deuda técnica conocida (P2 — no urgente)

- Web sell `addImageToCard` es no-op (feature de evidencia en Review no funciona)
- Web sell no valida formato de claimCode server-side ni minAmount/maxAmount
- Web sell back-navigation destruye el batch (useEffect wipe en mount)
- Web sell sin persist (refresh = pérdida total)
- Seller bot fotos guardadas como `telegramFileId` sin cifrar ni descargar (vs web que cifra con AES-256-GCM)
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
