// ─────────────────────────────────────────────────────────────────────────────
// UI Configuration — Status colors, badges, labels for domain enums
// Centralized UI configs used across admin and buyer/seller portals
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus, GiftcardStatus, PaymentCategory, PaymentDirection } from '@/generated/prisma/enums';
import type { ValidationState } from '@/hooks/use-sell-flow';
import { ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2, HelpCircle, ImageIcon, MinusCircle } from 'lucide-react';

// ── Order Status ─────────────────────────────────────────────────────────────

export const orderStatusConfig: Record<OrderStatus, { label: string; color: string; activeBg: string }> = {
  PENDING: {
    label: 'PENDIENTE',
    color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    activeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
  },
  AWAITING_PAYMENT: {
    label: 'ESPERANDO',
    color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    activeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
  },
  COMPLETED: {
    label: 'COMPLETADA',
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
  CANCELLED: {
    label: 'CANCELADA',
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    activeBg: 'bg-destructive/10 dark:bg-destructive/15',
  },
};

// ── Giftcard Status ─────────────────────────────────────────────────────────

export const giftcardStatusConfig: Record<GiftcardStatus, { label: string; color: string }> = {
  UNUSED: { label: 'Sin usar', color: 'bg-green-500/20 text-green-500' },
  USED: { label: 'Usada', color: 'bg-gray-500/20 text-gray-500' },
  ALREADY_USED: { label: 'Ya usada', color: 'bg-yellow-500/20 text-yellow-500' },
  INVALID: { label: 'Inválida', color: 'bg-red-500/20 text-red-500' },
  DEACTIVATED: { label: 'Desactivada', color: 'bg-red-500/20 text-red-500' },
  WRONG_AMOUNT: { label: 'Monto incorrecto', color: 'bg-orange-500/20 text-orange-500' },
};

// ── Payment Category ─────────────────────────────────────────────────────────

export const paymentCategoryConfig: Record<PaymentCategory, { label: string; icon: typeof ArrowUpRight; badge: string }> = {
  ORDER: { label: 'Orden', icon: ArrowUpRight, badge: 'text-green-700 bg-green-600/10 dark:text-green-400 dark:bg-green-400/10' },
  BATCH: { label: 'Batch', icon: ArrowDownRight, badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10' },
  DEPOSIT: {
    label: 'Depósito',
    icon: ArrowUpRight,
    badge: 'text-green-700 bg-green-600/10 dark:text-green-400 dark:bg-green-400/10',
  },
  REFUND_BUYER: {
    label: 'Refund Buyer',
    icon: ArrowDownRight,
    badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10',
  },
  REFUND_SELLER: {
    label: 'Refund Seller',
    icon: ArrowDownRight,
    badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10',
  },
  WITHDRAWAL: {
    label: 'Retiro',
    icon: ArrowDownRight,
    badge: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10',
  },
};

// ── Payment Direction ────────────────────────────────────────────────────────

export const paymentDirectionConfig: Record<PaymentDirection, { colorClass: string; prefix: string }> = {
  CREDIT: {
    colorClass: 'text-green-600',
    prefix: '+',
  },
  DEBIT: {
    colorClass: 'text-red-600',
    prefix: '-',
  },
};

// ── Sell Flow: Validation Status ────────────────────────────────────────────

export const validationStatusConfig: Record<
  ValidationState,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  amount_mismatch: { label: 'Review amount', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  amount_required: { label: 'Amount required', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
  code_new_detected: { label: 'New code', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: HelpCircle },
  no_capture: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ImageIcon },
  capture_mismatch: { label: 'Incorrect capture', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
  processing_error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertCircle },
  skipped: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: MinusCircle },
  amount_not_found: { label: 'Missing amount', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
  error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertCircle },
};

// ── Sell Flow: Processing Stage ─────────────────────────────────────────────

export type ProcessingStage = 'idle' | 'parsing' | 'uploading' | 'extracting' | 'ingesting' | 'done';

export const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  parsing: 'Parsing codes from text…',
  uploading: 'Uploading screenshots…',
  extracting: 'Analyzing screenshots with AI…',
  ingesting: 'Importing cards…',
  done: 'Done!',
};

export const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  idle: 0,
  parsing: 15,
  uploading: 35,
  extracting: 70,
  ingesting: 90,
  done: 100,
};
