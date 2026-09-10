// ─────────────────────────────────────────────────────────────────────────────
// registerCron — patrón único para todos los crons del proceso.
// Encapsula: guard anti-solapamiento (running), try/catch con logging y el
// log de inicio. Los jobs viven en ./jobs.ts.
//
// INVARIANTE (heredado de server.ts): los intervalos son FIJOS — la config se
// re-lee DENTRO de cada tick. Un setInterval congela su intervalo al crearse,
// así que derivarlo de un setting deja el scheduler corriendo con la duración
// del boot aunque el admin la cambie desde el panel (bug verificado).
// ─────────────────────────────────────────────────────────────────────────────

import { logger } from '@/lib/logger';

export interface CronJobDef {
  /** Nombre para logs: [name] */
  name: string;
  intervalMs: number;
  run: () => Promise<void>;
  /** Hook opcional de arranque (ej. loguear la config inicial). */
  onInit?: () => Promise<void>;
}

function toLogError(err: unknown) {
  const e = err as Error;
  return { name: e?.name ?? 'Error', message: e?.message ?? 'Unknown' };
}

export async function registerCron(def: CronJobDef): Promise<void> {
  try {
    if (def.onInit) {
      await def.onInit();
    } else {
      logger.info(`[${def.name}] Iniciado - intervalo: ${def.intervalMs / 60000}min`);
    }

    let running = false;

    setInterval(async () => {
      if (running) {
        logger.info(`[${def.name}] Skipping — previous run still active`);
        return;
      }
      running = true;
      try {
        await def.run();
      } catch (err) {
        logger.error(`[${def.name}] Error en ciclo`, { error: toLogError(err) });
      } finally {
        running = false;
      }
    }, def.intervalMs);
  } catch (err) {
    logger.error(`[${def.name}] Error al iniciar`, { error: toLogError(err) });
  }
}
