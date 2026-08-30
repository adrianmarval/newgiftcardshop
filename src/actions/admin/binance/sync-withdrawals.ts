'use server';

import { adminActionClient } from '@/lib/safe-action';
import { syncPendingSellerPayments } from '@/lib/services/payment/seller-payout.service';
import { syncPendingAdminWithdrawals } from '@/lib/services/payment/admin-withdrawal.service';
import { syncWithdrawalsOutputSchema } from './schemas';

export const syncPendingWithdrawals = adminActionClient
  .outputSchema(syncWithdrawalsOutputSchema)
  .action(async () => {
    // ── 1. Sync admin withdrawals ────────────────────────────────────────────

    const adminResults = await syncPendingAdminWithdrawals();

    const results = {
      ...adminResults,
      errors: [...adminResults.errors],
      sellerPayouts: { total: 0, resolved: 0, failed: 0, stillPending: 0, errors: [] as string[] },
    };

    // ── 2. Sync seller batch payouts ─────────────────────────────────────────

    try {
      const sellerResults = await syncPendingSellerPayments();
      results.sellerPayouts = {
        total: sellerResults.total,
        resolved: sellerResults.resolved,
        failed: sellerResults.failed,
        stillPending: sellerResults.stillPending,
        errors: sellerResults.errors,
      };

      // Merge into totals
      results.total += sellerResults.total;
      results.resolved += sellerResults.resolved;
      results.failed += sellerResults.failed;
      results.stillPending += sellerResults.stillPending;
      results.errors.push(...sellerResults.errors);
    } catch (error) {
      results.errors.push(`Error sync seller payouts: ${(error as Error).message}`);
    }

    return results;
  });
