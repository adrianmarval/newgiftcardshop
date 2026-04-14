// ─────────────────────────────────────────────────────────────────────────────
// Order Types — Payment entity
// ─────────────────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  balanceAfter?: number;
  status: string;
  transactionType?: string;
  createdAt: string;
  updatedAt?: string;
}
