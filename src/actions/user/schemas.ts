// ─────────────────────────────────────────────────────────────────────────────
// User — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getTelegramProfilePhotoOutputSchema = z.union([
  z.object({ success: z.literal(true), dataUrl: z.string() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);