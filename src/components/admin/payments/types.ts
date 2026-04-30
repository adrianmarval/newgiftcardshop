// ─────────────────────────────────────────────────────────────────────────────
// Admin Payments Component Props
// ─────────────────────────────────────────────────────────────────────────────

import type { AdminPayment } from '@/types/domain/admin';
import type { PaginationMeta } from '@/types/application/shared';

export interface AdminPaymentsListProps {
  payments: AdminPayment[];
  totalPages: number;
}

export interface AdminPaymentsFiltersProps {
  sellers: Array<{ id: string; name: string; email: string }>;
  buyers: Array<{ id: string; name: string; email: string }>;
}

export interface AdminPaymentsViewProps {
  payments: AdminPayment[];
  pagination: PaginationMeta;
  sellers: Array<{ id: string; name: string; email: string }>;
  buyers: Array<{ id: string; name: string; email: string }>;
  admins: Array<{ id: string; name: string; email: string }>;
}

export interface AdminDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admins: Array<{ id: string; name: string; email: string }>;
  onSuccess: () => void;
}

export interface AdminRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellers: Array<{ id: string; name: string; email: string }>;
  buyers: Array<{ id: string; name: string; email: string }>;
  onSuccess: () => void;
}
