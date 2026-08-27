// ─────────────────────────────────────────────────────────────────────────────
// UI Configuration — Status colors, badges, labels for domain enums
// Centralized UI configs used across admin and buyer/seller portals
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus, PaymentCategory, PaymentDirection, PaymentStatus, GiftcardIssueType } from '@/generated/prisma/enums';
import type { ValidationState } from '@/types';
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

// ── Giftcard Issue Type ───────────────────────────────────────────────────────

export const giftcardIssueTypeConfig: Record<GiftcardIssueType, { label: string; color: string }> = {
  INVALID: { label: 'Inválida', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
  ALREADY_USED: { label: 'Ya usada', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  DEACTIVATED: { label: 'Desactivada', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  WRONG_AMOUNT: { label: 'Monto incorrecto', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
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

// ── Payment Status ──────────────────────────────────────────────────────────

export const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  COMPLETED: {
    label: 'COMPLETADO',
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
  },
  PENDING: {
    label: 'PENDIENTE',
    color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  },
  FAILED: {
    label: 'FALLIDO',
    color: 'bg-red-500/20 text-red-500 border-red-500/30',
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
