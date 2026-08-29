'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { DriveStep } from 'driver.js';
import { BASE_DRIVER_CONFIG, TOUR_BUTTON_TEXTS, type TourId, type TourPortal } from '@/lib/tour';
import { markTourSeen } from '@/actions/tours';
import { useOverlayArbiter } from '@/hooks/use-overlay-arbiter';

interface UseTourOptions {
  tourId: TourId;
  steps: DriveStep[];
  portal: TourPortal;
}

/**
 * Instancia driver.js para un tour puntual. `start()` es idempotente: destruye
 * cualquier instancia previa antes de arrancar. Al destruirse el tour (completado
 * O skipeado) persiste el flag en DB vía markTourSeen — si el usuario lo cerró,
 * no se le vuelve a mostrar el prompt.
 *
 * INVARIANTE: el tour nunca convive con otro overlay bloqueante (push prompt,
 * security gate). driver.js mata pointer-events de TODA la página y su overlay
 * tapa los dialogs de Radix — el usuario no podría responderlos. Por eso
 * `start()` claimea el slot 'tour' del overlay-arbiter y devuelve false si
 * está ocupado; el slot se libera en onDestroyed.
 */
export function useTour({ tourId, steps, portal }: UseTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const start = useCallback((): boolean => {
    driverRef.current?.destroy();

    if (!useOverlayArbiter.getState().claim('tour')) return false;

    const driverObj = driver({
      ...BASE_DRIVER_CONFIG,
      ...TOUR_BUTTON_TEXTS[portal],
      steps,
      onDestroyed: () => {
        useOverlayArbiter.getState().release('tour');
        void markTourSeen({ tourId });
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
    return true;
  }, [tourId, steps, portal]);

  // Cleanup: destruir el overlay si el componente se desmonta con el tour activo.
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  return { start };
}
