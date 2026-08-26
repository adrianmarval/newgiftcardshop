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
      description: 'Un recorrido de 30 segundos por lo esencial. Pulsa ESC para salir cuando quieras; puedes repetirlo desde el botón “?” de la barra superior.',
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
      description: 'Recibes los códigos ANTES de pagar. Aquí ves tu límite, lo que ya utilizaste y lo que te queda disponible.',
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
      description: 'Todas tus compras quedan registradas aquí. Veamos cómo leerlas — puedes repetir este tour cuando quieras desde el botón “?” de la barra superior.',
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
    element: '[data-tour="orders-list"]',
    popover: {
      title: 'Cómo leer una orden',
      description: 'Cada tarjeta muestra el total, el estado y una barra de progreso. Tócala para ver los códigos y el detalle de la compra.',
      side: 'top',
    },
  },
  {
    popover: {
      title: 'Órdenes pendientes',
      description: 'Si una orden quedó Pendiente o Esperando pago, usa el botón “Completar Orden” de su tarjeta para retomar el pago justo donde la dejaste.',
    },
  },
];

export const BUY_WIZARD_STEPS: DriveStep[] = [  {
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
      description: 'Las tarjetas quedan reservadas para ti y ves los códigos al instante. La primera vez te pediremos un PIN de seguridad o tu passkey: es una medida antirrobo, no un trámite.',
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
      description: 'Pagas con Binance Pay y pegas el TxID de la transferencia. Al confirmarse, tu crédito se libera para la próxima compra.',
    },
  },
];
