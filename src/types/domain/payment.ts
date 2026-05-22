// ─────────────────────────────────────────────────────────────────────────────
// Payment — Entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { PaymentDirection, PaymentCategory, PaymentReferenceType } from '@/generated/prisma/enums';

export { PaymentDirection, PaymentCategory };

// ── Payment ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  balanceAfter: number;
  direction: PaymentDirection;
  category: PaymentCategory;
  binanceTxId?: string | null;
  relatedUserId?: string | null;
  relatedUserName?: string | null;
  relatedUserEmail?: string | null;
  notes?: string | null;
  referenceType?: PaymentReferenceType | null;
  referenceId?: string | null;
  orderId?: string | null;
  batchId?: number | null;
  createdAt: string;
}
