// ─────────────────────────────────────────────────────────────────────────────
// Admin Orders Component Props
// ─────────────────────────────────────────────────────────────────────────────

import type { AdminOrder } from '@/types/domain/admin';
import type { OrderStatus } from '@/types/domain/order';
import type { Giftcard } from '@/types/domain/giftcard';
import type { PaginationMeta } from '@/types/application/shared';

export interface AdminOrdersListProps {
  orders: AdminOrder[];
  totalPages: number;
  onCardClick?: (card: Giftcard, orderStatus: OrderStatus) => void;
  onViewBuyer?: (order: AdminOrder) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}

export interface AdminOrderDetailsProps {
  order: AdminOrder;
  onCardClick?: (card: Giftcard, orderStatus: OrderStatus) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}

export interface AdminOrdersFiltersProps {
  buyers: Array<{ id: string; name: string; email: string }>;
}

export interface AdminOrderCardProps {
  order: AdminOrder;
  onCardClick?: (card: Giftcard, orderStatus: OrderStatus) => void;
  onViewBuyer?: (order: AdminOrder) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
  isExpanded?: boolean;
  onToggle: () => void;
}

export interface AdminOrdersViewProps {
  orders: AdminOrder[];
  buyers: Array<{ id: string; name: string; email: string }>;
  pagination: PaginationMeta;
}

export interface AdminReportDialogProps {
  card: Giftcard | null;
  orderId: string | null;
  mode: 'ADD' | 'EDIT' | 'DELETE' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface AdminBuyerDialogProps {
  buyer: {
    id: string;
    name: string;
    email: string;
    buyRate: number;
    orderCount: number;
    createdAt: string;
    twoFactorEnabled: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
