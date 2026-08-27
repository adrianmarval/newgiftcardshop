// ─────────────────────────────────────────────────────────────────────────────
// Onboarding tours — Buyer (UI en español neutro)
// Anclas: atributos data-tour en los componentes (NUNCA clases Tailwind).
// Steps sin `element` = popover centrado (explican pasos aún no renderizados).
// ─────────────────────────────────────────────────────────────────────────────

import type { DriveStep } from 'driver.js';

export const BUY_DASHBOARD_STEPS: DriveStep[] = [
  {
    popover: {
      title: '¡Bienvenido!',
      description:
        'Un recorrido de 30 segundos por lo esencial. Pulsa ESC para salir cuando quieras; puedes repetirlo desde el botón “?” de la barra superior.',
    },
  },
  {
    element: '[data-tour="buy-explore"]',
    popover: {
      title: 'Aquí se compra',
      description: 'Explora las gift cards disponibles con descuento y crea tu primera orden.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="buy-credit"]',
    popover: {
      title: 'Tu crédito',
      description:
        'Recibes los códigos ANTES de pagar. Aquí ves tu límite de crédito en Giftcards (Disponible y Usado), y tu deuda pendiente en USDT.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="buy-recent-orders"]',
    popover: {
      title: 'Tus órdenes',
      description: 'Sigue el estado de cada compra. Al pagar las pendientes liberas crédito para la próxima.',
      side: 'top',
    },
  },
];

export const BUY_ORDERS_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Tu historial de órdenes',
      description:
        'Todas tus compras quedan registradas aquí. Veamos cómo leerlas — puedes repetir este tour cuando quieras desde el botón “?” de la barra superior.',
    },
  },
  {
    element: '[data-tour="orders-filters"]',
    popover: {
      title: 'Encuentra cualquier orden',
      description: 'Busca por número de orden o código, filtra por estado o cambia el orden por fecha.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="order-card"]',
    // Sin órdenes → este paso (y el de detalle) se saltan automáticamente.
    skipMissingElement: true,
    onHighlightStarted: () => {
      // Expandir la primera orden para mostrar su interior en el paso siguiente.
      // Idempotente: si ya está expandida (navegación atrás), no la cierra.
      if (document.querySelector('[data-tour="order-details"]')) return;
      (document.querySelector('[data-tour="order-card"] [id^="registry-card-"]') as HTMLElement | null)?.click();
    },
    popover: {
      title: 'Cómo leer una orden',
      description:
        'El total y el precio arriba a la derecha; el estado y la barra de progreso debajo. La acabamos de expandir para mostrarte el interior.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="order-details"]',
    skipMissingElement: true,
    // La expansión renderiza async — driver observa el DOM hasta que aparezca.
    waitForElement: 4000,
    popover: {
      title: 'Tus códigos',
      description:
        'Aquí están los códigos de la compra. Si es tu primera vez, te pediremos tu PIN de seguridad o passkey para revelarlos: es una protección antirrobo, no un trámite.',
      side: 'top',
    },
  },
  {
    popover: {
      title: 'Órdenes pendientes',
      description:
        'Si una orden quedó Pendiente o Esperando pago, usa el botón “Completar Orden” de su tarjeta para retomar el pago justo donde la dejaste.',
    },
    onHighlightStarted: () => {
      // Colapsar la orden al terminar para restaurar la lista completa.
      if (!document.querySelector('[data-tour="order-details"]')) return;
      (document.querySelector('[data-tour="order-card"] [id^="registry-card-"]') as HTMLElement | null)?.click();
    },
  },
];

export const BUY_WIZARD_STEPS: DriveStep[] = [
  {
    element: '[data-tour="buy-progress"]',
    popover: {
      title: '5 pasos y listo',
      description: 'Buscar → Seleccionar → Redimir → Uso → Pagar. Te mostramos lo importante de cada uno.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="buy-search"]',
    popover: {
      title: 'Paso 1 — Busca',
      description: 'Elige país, marca y el monto que necesitas. El sistema arma la mejor combinación de tarjetas por ti.',
      side: 'bottom',
    },
  },
  {
    popover: {
      title: 'Pasos 2 y 3 — Tus códigos',
      description:
        'Las tarjetas quedan reservadas para ti y ves los códigos al instante. La primera vez te pediremos un PIN de seguridad o tu passkey: es una medida antirrobo, no un trámite.',
    },
  },
  {
    popover: {
      title: 'Paso 4 — Confirma el uso',
      description: 'Marca si cada tarjeta funcionó. Si alguna tenía saldo cero, la reportas y ese monto se descuenta de tu pago.',
    },
  },
  {
    popover: {
      title: 'Paso 5 — Paga',
      description:
        'Pagas con Binance Pay y pegas el TxID de la transferencia. Al confirmarse, tu crédito se libera para la próxima compra.',
    },
  },
];
