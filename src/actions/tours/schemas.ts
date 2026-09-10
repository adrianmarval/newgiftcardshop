// ─────────────────────────────────────────────────────────────────────────────
// Onboarding tours — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { TOUR_IDS } from '@/lib/tour';


export const markTourSeenInputSchema = z.object({
  tourId: z.enum(TOUR_IDS),
});

export const markTourSeenOutputSchema = z.object({
  success: z.literal(true),
  toursSeen: z.array(z.string()),
});
