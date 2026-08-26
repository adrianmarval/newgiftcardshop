'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import type { DriveStep } from 'driver.js';
import { useTour } from '@/hooks/use-tour';
import {
  SELL_DASHBOARD_STEPS,
  SELL_WIZARD_STEPS,
  SELL_BATCHES_STEPS,
  BUY_DASHBOARD_STEPS,
  BUY_WIZARD_STEPS,
  BUY_ORDERS_STEPS,
  type TourId,
  type TourPortal,
} from '@/lib/tour';
import { getToursSeen } from '@/actions/tours';

const TOUR_REGISTRY: Record<TourId, { portal: TourPortal; steps: DriveStep[] }> = {
  'sell-dashboard': { portal: 'seller', steps: SELL_DASHBOARD_STEPS },
  'sell-wizard': { portal: 'seller', steps: SELL_WIZARD_STEPS },
  'sell-batches': { portal: 'seller', steps: SELL_BATCHES_STEPS },
  'buy-dashboard': { portal: 'buyer', steps: BUY_DASHBOARD_STEPS },
  'buy-wizard': { portal: 'buyer', steps: BUY_WIZARD_STEPS },
  'buy-orders': { portal: 'buyer', steps: BUY_ORDERS_STEPS },
};

// Rutas con tour asociado (match exacto de pathname, sin query).
const ROUTE_TOURS: Array<{ path: string; tourId: TourId }> = [
  { path: '/sell/dashboard/sell-cards', tourId: 'sell-wizard' },
  { path: '/sell/dashboard/cards', tourId: 'sell-batches' },
  { path: '/store/dashboard/browse-cards', tourId: 'buy-wizard' },
  { path: '/store/dashboard/orders', tourId: 'buy-orders' },
  { path: '/sell/dashboard', tourId: 'sell-dashboard' },
  { path: '/store/dashboard', tourId: 'buy-dashboard' },
];

function resolveTourId(pathname: string): TourId | null {
  return ROUTE_TOURS.find((r) => r.path === pathname)?.tourId ?? null;
}

// Reintentos esperando a que se cierre cualquier diálogo abierto (1 por segundo).
const MAX_DIALOG_WAIT_ATTEMPTS = 30;

function TopbarTourButtonInner({ tourId }: { tourId: TourId }) {
  const { portal, steps } = TOUR_REGISTRY[tourId];
  const { start } = useTour({ tourId, steps, portal });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start en la primera visita: SIN drawer — el tour arranca directo (patrón
  // de apps profesionales; ESC o la X lo cierran y marcan como visto). Espera a que
  // no haya ningún diálogo abierto (ej. el prompt de activar notificaciones push)
  // para no competir por la atención del usuario.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tryStart = () => {
      if (cancelled) return;
      // Gate de anclas: sin targets en el DOM (ej. wizard bloqueado por falta de
      // wallet) no arrancar ni marcar — se reintenta en la próxima visita.
      const hasAnchors = steps.some((s) => typeof s.element === 'string' && document.querySelector(s.element));
      if (!hasAnchors) return;
      // No interferir con otros overlays bloqueantes (push prompt, security gate...).
      const dialogOpen = document.querySelector('[role="dialog"]') !== null;
      if (dialogOpen) {
        attempts += 1;
        if (attempts < MAX_DIALOG_WAIT_ATTEMPTS) {
          timerRef.current = setTimeout(tryStart, 1000);
        }
        return;
      }
      start();
    };

    getToursSeen()
      .then((res) => {
        if (cancelled || res?.data?.toursSeen.includes(tourId)) return;
        // Delay inicial para no competir con la animación de entrada de la página.
        timerRef.current = setTimeout(tryStart, 1200);
      })
      .catch(() => {
        // Si falla la lectura, no auto-arrancar (el botón de replay sigue disponible).
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  const label = portal === 'seller' ? 'Replay the page tour' : 'Repetir el tour de la página';

  return (
    <button
      onClick={start}
      title={label}
      aria-label={label}
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
    >
      <CircleHelp className="h-5 w-5" />
    </button>
  );
}

/**
 * Botón '?' del topbar: replay manual del tour de la página actual + auto-start
 * en la primera visita. Solo se renderiza en rutas con tour definido (ROUTE_TOURS).
 * `key={tourId}` fuerza remount limpio al cambiar de página.
 */
export function TopbarTourButton() {
  const pathname = usePathname();
  const tourId = resolveTourId(pathname);
  if (!tourId) return null;
  return <TopbarTourButtonInner key={tourId} tourId={tourId} />;
}
