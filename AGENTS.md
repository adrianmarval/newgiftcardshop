# AGENTS.md — newgiftcardshop

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **DB**: PostgreSQL 17 + Prisma 7 (adapter-pg)
- **Data fetching (listas)**: TanStack Query + nuqs (shallow) — ver "Realtime por invalidación"
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
│   ├── admin/           # Dashboard admin (batches, orders, payments, brands, users, config, charts, stock-aging-table)
│   ├── auth/            # Cross-cutting auth (login, register, profile, 2FA, passkey/)
│   ├── buy/             # Wizard de compra web (5 steps) + giftcard-orders
│   ├── common/          # Shared presentational components (stat-card, giftcard-item, etc.)
│   ├── emails/          # Resend email templates
│   ├── layout/          # Dashboard layout, sidebar, topbar
│   ├── notifications/   # Cross-portal notifications
│   ├── sell/            # Wizard de venta web (3 steps) + giftcard-batches
│   └── ui/              # shadcn/ui primitives
├── hooks/               # use-sell-flow, use-buy-flow (Zustand), use-tour (driver.js), use-list-query (TanStack Query)
├── providers/           # React context providers (notifications, realtime SSE)
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
- **Onboarding tours (driver.js)**: Micro-tours por página (máx 5 pasos), NO un tour gigante. Definiciones en `src/lib/tour/` (`seller-tours.ts` EN / `buyer-tours.ts` ES neutro — mismo idioma que la UI del portal), ids en `tour.constants.ts` (`sell-dashboard`, `sell-wizard`, `sell-batches`, `buy-dashboard`, `buy-wizard`, `buy-orders`). Persistencia cross-device en `User.toursSeen` (JSON string[]) via `actions/tours` (`getToursSeen`/`markTourSeen` — append idempotente; skipear también marca como visto). Mounting: `TopbarTourButton` (`@/components/common`) vive en el topbar (`app-top-bar.tsx`, entre la campana y el theme toggle) y mapea `usePathname()` → tourId (`ROUTE_TOURS`, match exacto); `seen` se consulta client-side via `getToursSeen()` al montar. **Auto-start SIN drawer**: en la primera visita el tour arranca directo tras ~1.2s (patrón de apps profesionales — ESC o la X lo cierran y marcan visto), esperando hasta 60s a que no haya ningún overlay bloqueante abierto para NO interferir con el prompt de activar notificaciones push; solo arranca si las anclas existen en el DOM (ej. sell-wizard no arranca si el wizard está bloqueado por falta de wallet). **Exclusión mutua tour/prompt (overlay-arbiter)**: driver.js mata los pointer-events de TODA la página (`.driver-active *`) y su overlay (z-10000) tapa los dialogs de Radix (z-50) — si el tour arranca con el push prompt abierto, el usuario no puede responderlo y un click/ESC cierra ambos. El contrato explícito es el store zustand `use-overlay-arbiter.ts` (slot único: `'push-prompt' | 'tour'`): `useTour.start()` claimea `'tour'` (devuelve false si ocupado; se libera en `onDestroyed`) y `PushPromptDrawer` claimea `'push-prompt'` mientras está abierto y NUNCA abre con un tour activo (abre solo cuando el tour termina). El auto-start espera el slot libre + el check de `[role="dialog"]` como safety net para overlays no integrados (security gate). El botón `?` siempre permite replay manual — si el prompt está abierto no arranca y avisa con toast. El push prompt además espera `push.ready` (sync inicial del hook) para no flashear abierto en usuarios ya suscritos. Anclas: atributos `data-tour="..."` en contenedores estables (NUNCA clases Tailwind). Theming: `.driver-popover.app-tour` en globals.css **FUERA de @layer** (driver.css carga sin capa y ganaría a cualquier regla layerada). Para agregar un tour: id nuevo en `TOUR_IDS` + steps + entrada en `ROUTE_TOURS`/`TOUR_REGISTRY` de `topbar-tour-button.tsx`. **Tours con cards expandibles** (batches/orders): el ancla va en la PRIMERA card via closure en `renderItem` (`data-tour={item.id === items[0]?.id ? ... : undefined}` — no tocar RegistryList/RegistryCard); el step de la card usa `skipMissingElement: true` + `onHighlightStarted` que hace `.click()` en `[data-tour="X-card"] [id^="registry-card-"]` para expandirla (idempotente: solo si `[data-tour="X-details"]` no existe), el step de detalles usa `skipMissingElement: true` + `waitForElement: 4000` (MutationObserver de driver espera al render async), y el último step la colapsa en `onHighlightStarted` para restaurar la lista (RegistryList filtra a solo la expandida). El ancla de detalles envuelve TODAS las ramas (ej. UnlockGate cuando `codesLocked`).

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
- **Live availability grid** (`components/buy/live-availability-grid.tsx`): reemplaza la vieja card "Disponibles" del buyer dashboard. Data de `actions/buyer/stats/get-live-availability.ts` — por marca CON TARIFA ASIGNADA retorna stock total y ACCESIBLE (`escalationTier ≤ floor(buyRate*100)` — lo que el buyer realmente puede comprar). La UI es monto-first (la cantidad de tarjetas no se muestra): grande `$X a tu tasa` (accesible) y gris `$Y en plataforma` siempre visible debajo (mismo copy que las notificaciones de stock). Near-real-time gratis: el `RealtimeProvider` (SSE, layout — ver "Realtime por invalidación") invalida la query `['live-availability']` <1s después de cualquier cambio de stock y los montos animan con `@number-flow/react` (NumberFlow — dígitos rodantes). Click en una card → `/store/dashboard/browse-cards?brand=<brandId>&country=<countryId>` — la página valida el par contra el catálogo y `BuyGiftcardManager` lo aplica DESPUÉS de `resetForm()` (formato del store: `selectedBrand = 'brandId|countryId'`). La MISMA info accesible aparece en el step 1 del wizard: browse-cards fetchea `getLiveAvailability` y pasa un mapa `brandCountryId → accessibleAmount` hasta `BrandCountryGrid` (prop opt-in `accessibleAmountByBrandCountry` — sell flow no la pasa y mantiene el badge `$X disponible` original). **Deep links en notificaciones de stock**: `STOCK_AVAILABLE`, `TIER_DROP_ACCESS` y reminder usan actionUrl con `?brand=&country=` (preselección directa); `BrandCountryInfo` lleva `brandId`/`countryId` para construirlas.
- Pago: `src/actions/buyer/orders/complete-order.ts` (buyer reporta TxID, sin verificación automática aún)
- Crédito: buyer tiene `creditLimit`, se revalida dentro de la transacción de create-order
- Tiers: giftcards tienen `escalationTier` que baja con el tiempo (cron en server.ts — tick FIJO 1min con config re-leída en cada tick; NUNCA derivar el intervalo del setInterval del setting `escalation_duration_minutes`, setInterval congela su intervalo al crearse y el cambio desde el panel no tomaría efecto sin reiniciar) — buyer solo puede tomar cards con tier ≤ su buyRate
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

- Módulo: `src/bot/shared/web-claim.ts` (compartido por ambos bots). Entry: botón `claim_web_start` en el menú principal — solo se renderiza si `hasLegacyEmail(user.email)` (en "🌐 Activate Web Access" seller / es "🌐 Activar acceso web" buyer); tras el claim el botón se transforma en un acceso directo permanente al panel web (`📲 Install App` → `/sell/dashboard` / `📲 Instalar app` → `/store/dashboard`, via `NEXT_PUBLIC_APP_URL`; se omite si la env var no está definida). **OJO**: el botón es tipo `web_app` (Mini App), NO `url` — apunta a la página trampolín `src/app/tg-open/page.tsx`, que fuerza la apertura en browser externo vía `Telegram.WebApp.openLink(url, { try_browser: 'chrome' })` (un botón `url` siempre abre el WebView in-app de Telegram; la Bot API no permite forzar browser externo). `openLink` exige interacción del usuario, por eso la página muestra un botón (no hay auto-redirect). Destinos permitidos: allowlist hardcodeada en la página (anti open-redirect). **Install landing**: la Mini App abre `/tg-open?to=<target>&intent=install`, que en el browser externo funciona como landing de instalación PWA — captura `beforeinstallprompt` (no existe en WebViews; por eso la instalación NO puede ocurrir dentro de Telegram) y muestra botón Install → diálogo nativo → estado `installing` con spinner (la instalación WebAPK tarda segundos tras aceptar) → `appinstalled` → pantalla de éxito (NO redirect a la versión web ni `window.close()` — el objetivo es que el usuario abra la PWA desde su home screen; no existe API para lanzarla desde la web). **Detección de ya-instalada**: `navigator.getInstalledRelatedApps()` (Chrome Android) con entrada self-referencial `related_applications` en `buy.webmanifest`/`sell.webmanifest` — la `url` es ABSOLUTA al dominio de despliegue (`NEXT_PUBLIC_APP_URL`); si el dominio cambia hay que actualizar los manifests. Si ya está instalada, el landing muestra "Ya tienes la app instalada" inmediato en vez de esperar el timeout; en iOS (sin `beforeinstallprompt`) muestra instrucciones "Compartir → Añadir a pantalla de inicio"; timeout 6s sin evento → fallback "Abrir la app". `/tg-open` sobreescribe `metadata.manifest` por destino vía `generateMetadata` (sin esto, un buyer instalaría la PWA de SELL del root layout). **Captura de `beforeinstallprompt`**: el evento dispara UNA sola vez, apenas el SW activa — antes de que cualquier componente React monte (y NO se re-emite). Por eso la captura es GLOBAL: inline `Script beforeInteractive` en el root layout (`#pwa-install-capture`) que guarda el evento en `window.__pwaInstallPrompt` y anuncia vía evento DOM `pwa-installable`/`pwa-installed`; el landing (y cualquier futuro CTA de instalación in-app) solo adopta el stash. El contenido modo-dependiente de `/tg-open` vive en `tg-open-content.tsx` con `dynamic(ssr:false)` — cualquier setState de detección durante la hidratación concurrente de React 19 aborta el árbol SSR (recoverable "Hydration failed", verificado en Telegram Web weba); con ssr:false ese sub-árbol no participa en la hidratación. **Supresión de Chrome**: si el usuario dismissea el diálogo de instalación, Chrome suprime `beforeinstallprompt` por un tiempo — el fallback del menú ⋮ cubre ese caso.
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
- **INVARIANTE — scope del SW de push ⊆ scope del WebAPK**: Chrome Android atribuye una notificación push a la PWA instalada (ícono y nombre de la app en vez de Chrome) SOLO si el scope del SW que la recibe matchea el intent-filter del WebAPK (generado del `scope` del manifest; ver `WebApkValidator.queryFirstWebApkPackage`). Por eso el SW se registra con el scope del portal (`getPortalSwScope` en `@/lib/utils`: `/sell/`, `/store/`, `/admin/`) en `notification-provider.tsx` y `use-push-subscription.ts`. NUNCA registrar el SW de push en scope `/` — queda fuera de los 3 WebAPKs y la notificación la postea Chrome. El hook migra silenciosamente suscripciones legacy (scope `/`) al scope del portal.
- **Observaciones**: SW sin fetch handler (OK en Chrome 108+, el requisito se eliminó). Íconos 192/512 reales (cuadrados) + versiones maskable con safe zone (`icon-maskable-*.png`) en los 3 manifests. iOS no soporta `beforeinstallprompt`.

## Decisiones de negocio intencionales

1. **Pago sin verificación automática**: El buyer escribe un TxID y la orden pasa a COMPLETED. La verificación con API de Binance se implementará a futuro. El buyer pasa por un filtro manual del admin, se confía en él.
2. **Codes antes del pago**: Los claim codes se entregan inmediatamente al crear la orden (PENDING). El buyer los redime y paga después. Modelo de crédito.
3. **Cancelación automática de batches**: Un batch se auto-cancela cuando su monto a pagar es 0 (todas las tarjetas reportadas con saldo cero) Y todas sus cards están confirmadas (`isConfirmed`). Trigger: evento (`confirmOrderUsage`/`cancelOrder` en `order-lifecycle.service.ts`) + cron safety net (15min en `server.ts`). La guarda `isConfirmed` garantiza que los reportes son irreversibles antes de cancelar. Reutiliza `notifySellerBatchCancelled` existente.
4. **codeHash unique global**: Un claim code no debe existir en múltiples brand-countries. Si existe en US, no puede existir en UK.
5. **Fotos de evidencia del bot**: Se guarda solo `telegramFileId` (sin cifrar/descargar). Deuda técnica conocida.
6. **Passkeys**: Plugin `@better-auth/passkey` (pineado a 1.5.6, matchea better-auth core — NO usar `^` en la versión, un minor más nuevo exige core más nuevo). `signIn.passkey` bypasea la action `login`, por eso existe `actions/auth/complete-passkey-login.ts` que revalida la guarda rol/portal server-side (sin ella, un BUYER con passkey entraría al portal sell). El sign-in con passkey NO pide TOTP aunque el usuario tenga 2FA activo (comportamiento del plugin — la passkey ya es factor fuerte: posesión + biometría). Prompt de registro post-login: vista intersticial dedicada `/[portal]/auth/setup-passkey` (page server self-guarding: sin sesión/con passkeys/dismissed → redirect; `PasskeySetupView` client). La action `login` decide el redirect (passkey count + cookie `passkey_setup_done`, definida en `lib/constants.ts`, seteada client-side vía `markPasskeySetupDone`); el flujo 2FA aterriza ahí siempre y la página rebota al dashboard si no aplica. Conditional UI (autofill) activa en el campo email del login (`autocomplete="username webauthn"`). WebAuthn no funciona en iframes cross-origin (Telegram WebView) — la UI de passkey se auto-oculta si `PublicKeyCredential` no está disponible.
   - **Ceremonia de autenticación propia**: NO usamos `authClient.signIn.passkey()` — el wrapper del plugin hace `console.error` incondicional en cualquier excepción, incluida la cancelación del usuario (ruido rojo en consola al cancelar). `use-passkey-sign-in.ts` implementa la ceremonia con `@simplewebauthn/browser` directo (mismos endpoints `/passkey/generate-authenticate-options` + `/passkey/verify-authentication` vía `authClient.$fetch` — el atomListener `$sessionSignal` refresca la sesión igual). Cancelaciones (`ERROR_CEREMONY_ABORTED`, `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`/NotAllowedError) se tragan en silencio. El lado de registro (`addPasskey`) SÍ es limpio y se usa el wrapper del plugin. La misma ceremonia está extraída en `runPasskeyAuthentication()` (`passkey-utils.ts`) para re-autenticación dentro de sesión (gate de códigos). **OJO**: `verify-authentication` responde `{ session }` — NO incluye `user` aunque el OpenAPI del plugin diga lo contrario; el userId sale de `session.userId`.
7. **Gate de seguridad para revelar códigos (anti-hurto)**: Los claim codes solo salen del servidor/bot si la orden NO tiene cards sin confirmar (`isConfirmed=false` ⇒ códigos aún aplicables y robables) O el buyer tiene un unlock vigente (`securityUnlockedUntil`, 10 min, cross-canal web+bot). El gate vive en el REVEAL, no en la creación de la orden (cero fricción en el flujo de compra). Es OBLIGATORIO al primer reveal: buyer sin PIN ni passkey debe crear un PIN inline antes de ver códigos. Puntos gateados: `getOrderCards` (redeem step), `getOrderById` (detalle/resume), `listOrders` (masked `••••••••` + flag `codesLocked`, solo scope buyer — admin nunca se enmascara), reveal post-creación y `order_detail` del buyer-bot. Web prioriza passkey (si hay + WebAuthn soportado) con fallback a PIN; Telegram solo PIN (no hay WebAuthn en el bot). **El unlock por passkey exige sesión FRESCA (<60s)**: `unlockWithPasskey` rechaza sesiones viejas — la ceremonia `verify-authentication` siempre crea una sesión nueva (verificado en `@better-auth/passkey`: `createSession` + `setSessionCookie` incondicionales), así que una cookie robada (el escenario anti-hurto para el que existe el gate) no puede auto-otorgarse el unlock. Servicio compartido: `lib/services/security/security-pin.service.ts`. UI web: `components/buy/security/unlock-gate.tsx` + sección en perfil. Bot: `bot/buyer-bot/handlers/security-handler.ts` (wizard steps `awaitingSecurityPin`/`awaitingPinSetup*`/`awaitingPinReset*`/`awaitingPinChange*`, borra los mensajes con PIN/OTP vía `deleteUserInput`). Recuperación en ambos canales: OTP por email (`PinResetOtp` + template `pin-reset-otp.tsx`; `requestPinReset` NO swallowa errores a diferencia de `sendOtpEmail`). Lockout: 5 intentos fallidos → `pinLocked`, solo se recupera por email OTP.
8. **Pago automático a sellers (`auto_pay_sellers`)**: Cuando el setting está en `true` (default `false`, toggle en admin config), los batches que quedan fully-confirmed con monto pagadero > 0 se pagan automáticamente vía `executeSellerPayout`. Trigger: evento post-commit (`triggerAutoPayForOrder` en `confirmOrderUsage`/`cancelOrder`, fire-and-forget) + cron safety net (5min en `server.ts`, mismo ciclo corre `syncPendingSellerPayments` — resuelve PENDINGs sin clic manual). Elegibilidad: `isPaid=false`, `cancelledAt=null`, todas las cards `isConfirmed`, `canCancelBatch=false` (payable=0 es territorio del auto-cancel — son mutuamente excluyentes). **Seller sin wallet**: se notifica a seller + admin en el evento; el sweep lo excluye hasta que configure método de pago (entonces entra solo al siguiente ciclo). **Fallos = retry MANUAL**: el sweep solo toma batches SIN ningún Payment BATCH/DEBIT previo (primer intento) — un payout fallido alerta al admin (`notifyAdminPayoutFailed`) y se reintenta desde la UI. `executeSellerPayout(batchId, source)` con `source='auto'` dispara las alertas; `'manual'` no (el admin ya ve el error). Guards en el payout: tx Serializable + `isPaid` + Payment activo por batch + guard de balance (nunca decrementa si `platformBalance < payoutAmount`) + `withdrawOrderId` único por intento (`BATCH_<id>_<n>` — un retry tras FAILED nunca colisiona con la clave de idempotencia previa de Binance). El sync también alerta al admin si un pago aceptado por Binance falla después (status 1/3/5). Notificaciones al seller en 2 etapas: `notifySellerBatchPayoutSent` al enviar a Binance (feedback inmediato, aplica a payouts manuales y automáticos) y `notifySellerBatchPaid` cuando el sync confirma (status 6). Servicio: `lib/services/payment/auto-pay.service.ts`.
9. **Alertas de stock por Telegram/Push — toggle por usuario (`stockAlertsEnabled`)**: `STOCK_AVAILABLE` se persiste in-app al instante SIEMPRE (canal pull). Si además sale por Telegram/Push (canales interruptivos) lo decide el buyer con `NotificationPreference.stockAlertsEnabled` (default `true`): el dispatcher lo chequea tras el upsert de preferencia y retorna early si está off. UI: botón pulsable "Alertas ON/OFF" (nota musical 🎵) junto al título "Stock en vivo" (`live-availability-grid.tsx` — el flag viaja en el output de `getLiveAvailability`) + toggle en la página de notifications settings (buyer). Ambos llaman `updateNotificationPreferences({ stockAlertsEnabled })` con UI optimista + revert en error. `TIER_DROP_ACCESS` también sale por Telegram/Push respetando el mismo toggle — el dispatcher agrupa `STOCK_AVAILABLE` y `TIER_DROP_ACCESS` en `STOCK_ALERT_TYPES` y aplica el gate de `stockAlertsEnabled` a ambos (un tier drop puede ser la PRIMERA notificación útil si el stock llegó cuando la tasa del buyer no le daba acceso). (El viejo digest periódico anti-saturación — `StockDigestQueue`, sweep y setting `stock_digest_interval_minutes` — fue eliminado; ver migración `20260831120000_eliminar_digest_de_stock`.)
10. **Recordatorio de stock varado (`STOCK_REMINDER`)**: Cubre stock que nadie compra (mercado veloz: 24h de espera es inaceptable, los sellers valoran rotación rápida). Un sweep cada 5min (`server.ts` → `sweepStockReminders`, `lib/notifications/stock-reminder.service.ts`) recorre marcas activas y, por cada buyer con tasa, envía UN recordatorio si TODO su stock accesible es más viejo que el intervalo de la marca: `BrandCountry.stockReminderIntervalMinutes ?? stock_reminder_interval_minutes` (setting global, default 60min, min 15, grupo notifications; el intervalo por marca se edita en el form de brand-country — `updateBrandCountryLimits`). **Un knob, dos funciones**: el intervalo es a la vez el umbral de "varado" y el cooldown base por buyer. **Regla anti-ruido**: si el buyer tiene CUALQUIER tarjeta accesible más nueva que el intervalo → skip (ya fue nudgeado por `STOCK_AVAILABLE`); el reminder solo dispara con el stock accesible completamente quieto. **Anti-spam en 2 capas**: (1) fingerprint de novedad `"count:total:newestISO"` (las variables exactas del mensaje + fecha de la card más nueva, detecta cambios de composición con mismo count/total — todo sale del aggregate existente, cero queries extra): contenido nuevo → cooldown base; (2) cadencia escalonada para contenido IDÉNTICO: cooldown base × `REMINDER_ESCALATION_MULTIPLIERS = [1,6,24]` (tope ×24) indexado por `consecutiveIdentical` — con base 60min, 1er re-envío idéntico a las 6h, siguientes cada 24h (la escalera también limita fingerprints oscilantes en mercados activos). Al cerrarse un ciclo de estancamiento (stock fresco o sin stock accesible) el dedup se resetea (`lastFingerprint=null`, `consecutiveIdentical=0`, guardado por `not null` para no escribir en cada tick): el próximo estancamiento arranca con cadencia fresca. Estado en `StockReminderState` (la fila ES el dedup; upsert con `lastSentAt` epoch + claim atómico `updateMany` guardado — multi-instancia seguro; el claim solo toca `lastSentAt`, el fingerprint se persiste POST-dispatch exitoso, donde solo llega el ganador del claim); si el dispatch lanza, el claim se libera a epoch y reintenta el próximo ciclo con el fingerprint intacto. Envío via `notificationDispatcher.dispatch()` (persiste in-app + respeta telegram/push prefs); el filtro de suscripciones se aplica en el sweep (el dispatcher NO lo aplica). Complemento read-only: **Stock Aging report** en el admin dashboard (`actions/admin/stats/get-stock-aging-report.ts` + `components/admin/stock-aging-table.tsx`) — buckets de antigüedad `<1h/1-6h/6-24h/1-3d/>3d` por brand-country, ordenado por la tarjeta más vieja primero, para tunear escalación/recordatorios con criterio.
11. **Retiro de fondos del admin (ganancias de la plataforma)**: El admin retira USDT de la Funding wallet de Binance hacia una wallet de ahorro FIJA definida por env (`WITHDRAW_WALLET`/`WITHDRAW_COIN`/`WITHDRAW_NETWORK` — no configurable por request). Mismo patrón que `executeSellerPayout`: tx Serializable con guard anti-duplicados (UN solo retiro WITHDRAWAL/DEBIT PENDING a la vez — el anterior debe resolverse via sync antes de reintentar) + guard de balance (`amount ≤ platformBalance`, los fondos quedan "apartados" desde la creación — **invariante contable**: el decremento ocurre AL CREAR, así que COMPLETED nunca toca balance y FAILED revierte con increment exactamente una vez) + Payment PENDING con `withdrawOrderId = WD_<timestamp>` (idempotencia Binance). El retiro queda PENDING tras ser aceptado por Binance (el `binanceTxId` on-chain solo aparece en withdraw/history tras confirmación) — lo completa `syncPendingAdminWithdrawals()`: cron 5min en `server.ts` (mismo ciclo que auto-pay) + botón "Sincronizar Binance" en `/admin/dashboard/payments` (la action `syncPendingWithdrawals` sincroniza AMBOS: retiros admin + payouts a sellers). Error de red en el envío → queda PENDING y lo resuelve el sync. UI: botón "Retirar Fondos" en payments (`AdminWithdrawDialog` — muestra min(platformBalance, funding) como disponible, destino enmascarado via `getWithdrawInfo`, confirmación `showAlert.confirm` con `danger`) + `AdminWithdrawButton` en la card "Balance Binance" del admin dashboard. La action `withdrawBalance` además hace pre-check del balance Funding real antes de tocar la DB. Servicio: `lib/services/payment/admin-withdrawal.service.ts`.

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
- `src/lib/services/payment/admin-withdrawal.service.ts` — `executeAdminWithdrawal({ amount, notes? })` (retiro de ganancias a wallet fija por env + revert en fallo + guards de duplicado/balance), `syncPendingAdminWithdrawals()` (resuelve PENDINGs contra Binance; cron 5min + botón manual admin). Ver decisión #11.
- `src/lib/services/giftcard-reservation.service.ts` — `reserveGiftcards(tx, ids, orderId)` con `updateMany` guardado por `inStock/status/orderId` + verificación de `count`. Usado por web y bot.
- `src/lib/services/order/` — `order-lifecycle.service.ts` + `order-issue.service.ts`, compartidos web + buyer-bot. **Patrón anti-race cross-canal**: toda mutación sobre una orden PENDING hace el update guardado (`where: { id, status: 'PENDING' }`) como PRIMERA operación de la tx — lockea la fila y P2025 si otro canal ya la transicionó. `confirmOrderUsage` lockea la orden ANTES de leer las cards (el `adjustedTotal` siempre refleja el estado final); `reportGiftcardIssue`/`deleteGiftcardIssue` re-validan status DENTRO de la tx (bump de `updatedAt`) — el pre-check fuera de la tx es solo fast-path, nunca la guarda real.
- `src/lib/services/pricing.service.ts` — `getUserRates(userId, { brandCountryId? | brandId+countryId })` retorna `{ buyRate, sellRate }`
- `src/lib/services/giftcard-escalation.service.ts` — cron que baja `escalationTier` de cards inactivas
- `src/lib/settings/settings.service.ts` — `SettingsService` con `getPlatformBalance()`, `updatePlatformBalance()`, escalation config

## Realtime por invalidación (SSE)

La app es realtime via **invalidación dirigida**, NO via payloads: el socket NUNCA transporta data de dominio (cero superficie de fuga de claim codes/data de otro rol), solo señales `{ keys: RealtimeKey[] }`. La fuente de verdad sigue siendo el servidor (Prisma + security gates, via server actions); el cliente reacciona **invalidando el cache de TanStack Query** — NO con `router.refresh()` (ver por qué abajo).

- **Bus**: `src/lib/realtime/bus.ts` — EventEmitter singleton en `globalThis` (patrón BotRegistry). API: `publishToUser(userId, keys)` / `publishToUsers(ids, keys)` / `publishToRole(role, keys)`. **INVARIANTE — el `globalThis.__realtimeBus` se asigna SIEMPRE (no solo en dev)**: en producción webpack duplica el módulo en varios chunks (route handlers y server actions tienen copias separadas) y `server.ts` corre vía tsx con otro module graph; `globalThis` es lo único compartido — sin asignación incondicional cada chunk tiene su propio EventEmitter y los eventos nunca llegan al stream. **El mismo invariante aplica a TODOS los singletons cross-graph del repo**: `BotRegistry`, `prisma.ts` (sin esto cada chunk abre su propio Pool de 20 conexiones), `logger/index.ts` y el estado de `logger/db-transport.ts` (buffer + flush timer + shutdown hooks — sin estado compartido, `gracefulFlush` solo flusheaba la copia del graph de tsx y los logs de los chunks de Next se perdían al apagar). NUNCA reintroducir el condicional `if (NODE_ENV !== 'production')` en estos módulos. **Asume instancia única** (igual que los crons de `server.ts`); si se escala horizontalmente → swap a Redis pub/sub sin tocar publishers ni endpoint (la API del bus es el contrato). Server-only: NO re-exportar en barrels que toquen Client Components.
- **Endpoint**: `src/app/api/realtime/route.ts` (SSE, `runtime=nodejs`, `force-dynamic`). Auth via cookie better-auth (`auth.api.getSession` directo — NO `getSession()` de authorization.ts, que hace `unauthorized()` y rompería el stream; sin sesión → 401). Filtrado server-side por `userId` + `role`. Heartbeat como frame de DATA `{"type":"ping"}` cada 25s (proxies cierran idle) — NO comentario SSE `: ping`: por spec las líneas `:` nunca llegan a `onmessage`, así que un heartbeat-comentario es inobservable para el cliente y el watchdog no podría funcionar. Coalescing de 300ms por conexión (ráfagas → UN frame con la unión de keys), cleanup en `request.signal.abort`.
- **Cliente**: `src/providers/realtime-provider.tsx` (montado en `dashboard-layout.tsx`, reemplaza al viejo `AutoRefreshProvider`). Ante un evento invalida las query keys asociadas (`REALTIME_QUERY_KEYS` en `src/lib/realtime/query-keys.ts`) y React Query re-fetchea EN EL LUGAR — el router NO participa. **INVARIANTE — el provider JAMÁS llama `router.refresh()`**: un refresh que cae mientras hay una navegación del usuario en vuelo (Link click, paginación) la ABORTA y la URL revierte al último estado commiteado (bug del App Router — verificado con el síntoma "soft-nav orders→batches que regresa sola a orders a los ~2s"; ni `startTransition` lo elimina, el viejo fallback lo disparaba vía prefix-match de `ROUTE_KEYS` en páginas de lista admin + `resyncAll` incondicional). **NO EXISTE fallback**: una vista que no fetchea via React Query (`useListQuery` o `useQuery` con `initialData` del server page) y no registra su query key en `REALTIME_QUERY_KEYS` NO recibe updates realtime — al agregar una vista viva nueva, hay que registrar su key en el mapa. Pausa con tab oculto + resync al volver. **Conexión SSE ESTABLE por mount**: el EventSource NO se recrea al navegar (recrear por pathname generaba churn de suscripciones al bus y ruido ERR "stream canceled" en cloudflared/proxies). **Safety nets** (todos query-only): resync completo (invalidar todo) en `onopen` tras reconexión y al volver al tab; **watchdog anti half-open** (tunnels/proxies como cloudflared pueden dejar de entregar frames SIN cerrar el TCP — `onerror` nunca dispara y EventSource jamás reconecta solo): el cliente trackea `lastFrameAt` en cada frame (data o ping) y si pasan >75s sin frames (~3 heartbeats) con tab visible, cierra y reconecta manualmente; resync lento SIEMPRE activo (5min, solo tab visible) para convergencia eventual.
- **Listas con TanStack Query (`useListQuery`)**: las 8 vistas de listas (admin orders/batches/payments/issues/logs/users, seller batches, buyer orders) + campanita (`['unread-counts']`) + `live-availability-grid` (`['live-availability']`) fetchean client-side con `src/hooks/use-list-query.ts`. Patrón: el `page.tsx` server sigue fetcheando el primer paint y pasa `initialData` + `initialInput`; el view deriva el input de los search params via builders COMPARTIDOS page/view (`src/lib/search-params/list-inputs.ts` — misma URL → mismo input → initialData exacto); `placeholderData: keepPreviousData` evita flashes; los queryFn llaman las server actions existentes (role guards intactos). Paginación y filtros son nuqs **`shallow: true`** (URL instantánea, sin navegación server): clicks rápidos de paginación = UN fetch final (React Query descarta intermedios). Query keys: prefijos estables (`admin-orders`, `admin-batches`, `admin-payments`, `admin-issues`, `admin-logs`, `admin-users`, `seller-batches`, `buyer-orders`) — la invalidación SSE es por prefijo. **Home dashboards y notifications page también son query-based** (mismo patrón: server page fetchea primer paint → `initialData`, `useQuery` mantiene viva la data): sell home (`['seller-dashboard-stats']`, `['seller-recent-batches']` en `seller-dashboard-client.tsx`), store home (`['buyer-dashboard-stats']`, `['buyer-recent-orders']` en `buyer-dashboard.tsx`), admin home (5 secciones en `components/admin/dashboard-sections.tsx`: `['admin-binance-balance']`, `['platform-balance']`, `['admin-profit-stats']` — compartida por summary cards y ProfitChart — `['admin-inventory-stats']`, `['admin-stock-aging']`), y la página de notifications (`['notifications-page']` en `notifications-list.tsx`, updates optimistas de mark-as-read via `setQueryData`). Como el admin no recibe la key `stats`, sus queries de stats se invalidan via las keys que SÍ recibe: `orders`→`admin-profit-stats`, `payments`→`platform-balance`/`admin-binance-balance`/`admin-profit-stats`, `batches`→`admin-inventory-stats`/`admin-stock-aging` (ver el mapa). `QueryClientProvider` en `components/providers.tsx` (`staleTime: 30s`, `refetchOnWindowFocus: false` — la frescura fina la da el SSE).
- **Keys**: `notifications | orders | batches | availability | payments | stats | users` (las viejas `catalog`/`settings` se eliminaron del union — nunca tuvieron emit points).
- **Emit points**: `NotificationDispatcher.dispatch` (tras persistir → `['notifications']`, cubre TODOS los tipos), `order-lifecycle.service` (cancel/confirmUsage/complete → buyer `['orders','stats']`, sellers `['batches','stats']`, admin `['orders']`/`['orders','payments']`), `create-order.ts` (web) + `buy-handler.ts` (bot) (→ buyer `['orders','stats']`, rol BUYER `['availability']`, admin `['orders']`), `publish.service.ts` (→ seller `['batches','stats']`, BUYER `['availability']`, ADMIN `['batches']`), `escalation.ts` tier drops (→ BUYER `['availability']`), `seller-payout.service.ts` / `admin-withdrawal.service.ts` (payout enviado/revertido/sync resolved/failed → seller `['batches','stats']`, ADMIN `['payments']`), sweep auto-cancel en `server.ts` (→ sellers `['batches','stats']`, ADMIN `['batches']`).
- **Detección vs propagación**: realtime arregla la propagación servidor→cliente (<1s); la frecuencia de DETECCIÓN de lo que depende de cron (tier drops, sync Binance, recordatorios de stock) sigue siendo la del cron.
- Los `router.refresh()` post-mutación en vistas NO migradas (registry-card, settings) SE MANTIENEN — son feedback inmediato de acciones propias. En las vistas migradas a `useListQuery`, el feedback post-mutación es `queryClient.invalidateQueries` de su propia query key (admin orders/batches/payments/users ya lo hacen).

## Notificaciones — canales

El `NotificationDispatcher` (`src/lib/notifications/dispatcher.ts`) despacha por `userId` a estos canales:

- **In-app**: persiste en `Notification`; el dashboard se actualiza en <1s via SSE (`RealtimeProvider` — ver "Realtime por invalidación")
- **Telegram**: elige bot por rol (BUYER/ADMIN → buyer-bot, resto → seller-bot). Con `NOTIFICATIONS_TOPIC_ENABLED=true` y topic mode habilitado en @BotFather, las notificaciones se envían a un topic dedicado "🔔 Notificaciones" (forum topic mode en chats privados, Bot API 10.x). El topic se crea lazy por usuario y se persiste en `TelegramUser.notificationTopicId`. Si el usuario lo borra, se recrea automáticamente; si lo cierra, se reabre vía `reopenForumTopic`. Si el bot no tiene topic mode, fallback a mensaje plano (cache en memoria 1h para no spamear la API). Servicio: `telegram-topics.ts`. Simétricamente, los flujos interactivos van al topic "🤖 Menú": `renderUI` (`bot/shared/ui.ts`) resuelve el thread vía `resolveFlowThreadId` (sesión → `TelegramUser.flowTopicId` → creación lazy solo para usuarios vinculados con `TelegramUser` row; el wizard de registro renderiza en General para evitar duplicados) y pasa `message_thread_id` en los mensajes nuevos (los edits van por messageId y no lo necesitan). El topic General queda vacío — `hideGeneralForumTopic` NO funciona en chats privados (requiere admin en supergrupo).
  - **INVARIANTE — topic ids son por (bot, chat)**: `message_thread_id` es una secuencia independiente por chat. Un id persistido solo es válido si el `chatId` persistido junto a él (`TelegramUser.flowChatId` / `notificationChatId`, String porque los chat ids exceden Int32) coincide con el chat actual. Esto protege contra: cambio de rol (buyer-bot ↔ seller-bot via el action `admin/users/update-user` — ya NO expuesto en la UI del dialog de usuarios, solo por API/script), ADMIN usando ambos bots (los middlewares los aceptan), y el bot agregado a un grupo (`resolveFlowThreadId` retorna `undefined` si `chat.type !== 'private'`). Siempre persistir y validar el chatId junto al topicId.
  - **Anti-duplicados**: la creación usa claim atómico (`updateMany where field is null or chatId distinto`) — si dos procesos/instancias crean el topic concurrentemente, el perdedor borra su topic huérfano (`deleteForumTopic`) y adopta el del ganador. Los locks en memoria (`sequentialize`) NO bastan en multi-instancia. Solo se crean topics para usuarios vinculados (con `TelegramUser` row); el wizard de registro renderiza en General para evitar duplicados cuando Telegram reenvía updates o hay multi-instancia.
  - **Guard anti-service-messages**: los service messages generados por el propio bot (ej. `forum_topic_created` al crear un topic) son entregados por Telegram al bot. Sin el guard, authenticateBuyer/authenticateSeller los procesa como si fueran de un usuario no vinculado y renderiza "Tu cuenta no está vinculada" en el chat. El guard (`ctx.from?.id === botId`) está ANTES de session en ambos bots para no persistir filas basura en `bot_session`. Ver: commit previo / bug report "segundo mensaje no vinculada".
  - **Fallback final**: si los reintentos con thread fallan (borrado+cierre en ráfaga, recreación fallida), `renderUI` y el canal de notificaciones envían mensaje plano a General — el usuario NUNCA se queda sin UI por culpa de un topic.
  - **Detección de topic inválido**: `isTopicGoneError` matchea `thread not found` (borrado) y `topic closed` (cerrado, case-insensitive). Los usuarios no generan evento al borrar topics — la detección es lazy, al fallar el envío.
- **Web Push**: `WebPushChannel` (`channels/webpush.channel.ts`) con Push API + VAPID. Suscripciones en `PushSubscription` (endpoint `@unique`, varios dispositivos por user), toggle `pushEnabled` en `NotificationPreference`. SW en `public/sw.js`, registrado **con el scope del portal** por `NotificationProvider`/`use-push-subscription.ts` (ver invariante de scope en la sección PWA — es lo que hace que Android muestre el ícono/nombre de la app instalada en vez de Chrome). Hook `src/hooks/use-push-subscription.ts` + server actions `save-push-subscription`/`delete-push-subscription`/`send-test-push` (botón "Probar" en settings — bypass del dispatcher, solo canal push). El canal loguea `sent` (con counts) y `skipped` (con reason) a `app_log`; el dispatcher solo loguea `failed`. Endpoints muertos (404/410) se auto-eliminan. Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. En iOS requiere la PWA instalada (16.4+). Brave requiere "Google services for push messaging" habilitado (el hook detecta el fallo y devuelve `brave_push_service_disabled`).

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

**Package manager: pnpm** (NUNCA npm — `pnpm add`, `pnpm install`).

```bash
npx tsc --noEmit          # Typecheck (limpio = OK)
npm run lint              # ESLint (77 errores pre-existentes, todos no-explicit-any en bots)
npx prisma db push --accept-data-loss  # Push schema a DB local
npx prisma generate       # Regenerar client
docker compose up -d database  # Levantar Postgres local (puerto 5444)
lsof -nP -iTCP:3000 -sTCP:LISTEN  # Verificar qué proceso sirve :3000 (anti-zombies)
```

> **⚠️ Instancia ÚNICA de `tsx server.ts`**: una segunda instancia que no puede bindear :3000 muere al instante (fail-fast en `httpServer.on('error')`). Sin ese guard era un ZOMBIE invisible: sus crons (escalación, recordatorios de stock) y bots (long polling) seguían corriendo con código VIEJO y competían con la instancia real — races en tier drops (un dispatcher viejo manda Telegram aunque el código nuevo lo prohíba) y updates de Telegram robados entre pollers. `tsx` sin `--watch` NO recarga el graph de `server.ts`/crons/bots: tras cambios en `src/lib/notifications`, `src/lib/services` o `src/bot`, REINICIAR el proceso (el HMR de Next solo cubre el graph de la app web). Verificar huérfanos con `ps -eo pid,lstart,command | grep server.ts` antes de levantar dev.
