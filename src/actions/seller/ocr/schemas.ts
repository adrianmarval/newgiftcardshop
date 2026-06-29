// ─────────────────────────────────────────────────────────────────────────────
// Seller / OCR — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const extractDraftInputSchema = z.object({
  images: z.array(z.object({ id: z.string(), compressedData: z.string() })),
});

export const uploadImageInputSchema = z.object({ file: z.instanceof(File) });