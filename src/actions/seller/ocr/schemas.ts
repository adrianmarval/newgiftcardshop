// ─────────────────────────────────────────────────────────────────────────────
// Seller / OCR — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { MAX_BATCH_SIZE } from '@/lib/constants';

// Cap de imágenes por extracción: cada imagen cuesta hasta 3 llamadas pagas al
// provider de visión (retries) — sin límite, un seller podía disparar cientos
// de llamadas AI por click. MAX_BATCH_SIZE como techo: un batch nunca tiene
// más de 50 tarjetas, así que más imágenes nunca aportan.
export const extractDraftInputSchema = z.object({
  images: z
    .array(z.object({ id: z.string(), compressedData: z.string() }))
    .min(1)
    .max(MAX_BATCH_SIZE),
});

export const uploadImageInputSchema = z.object({ file: z.instanceof(File) });
