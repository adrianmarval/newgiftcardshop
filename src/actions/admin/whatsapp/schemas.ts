// ─────────────────────────────────────────────────────────────────────────────
// Admin / WhatsApp — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getWhatsAppStatusOutputSchema = z.object({
  success: z.literal(true),
  qr: z.string().nullable(),
  status: z.string(),
  phoneNumber: z.string().nullable(),
});

export const disconnectWhatsAppOutputSchema = z.object({ success: z.literal(true) });

export const reconnectWhatsAppOutputSchema = z.object({ success: z.literal(true) });