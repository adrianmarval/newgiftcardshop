'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { DriveStep } from 'driver.js';
import { BASE_DRIVER_CONFIG, TOUR_BUTTON_TEXTS, type TourId, type TourPortal } from '@/lib/tour';
import { markTourSeen } from '@/actions/tours';

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
 */
export function useTour({ tourId, steps, portal }: UseTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const start = useCallback(() => {
    driverRef.current?.destroy();

    const driverObj = driver({
      ...BASE_DRIVER_CONFIG,
      ...TOUR_BUTTON_TEXTS[portal],
      steps,
      onDestroyed: () => {
        void markTourSeen({ tourId });
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
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
