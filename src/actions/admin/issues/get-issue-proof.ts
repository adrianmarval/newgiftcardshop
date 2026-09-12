'use server';

import { adminActionClient } from '@/lib/safe-action';
import { getIssueProofData } from '@/lib/services/order';
import { getIssueProofInputSchema, getIssueProofOutputSchema } from './schemas';

/**
 * Resolves an issue's proof screenshot. Dual source:
 * - Web uploads: `proofData` (AES-256-GCM encrypted bytes) → decryptBuffer.
 * - Bot uploads: `proofImageUrl` is a Telegram file_id, resolved through the
 *   Bot API with BUYER_BOT_TOKEN (same pattern as get-batch-images).
 */
export const getIssueProof = adminActionClient
  .inputSchema(getIssueProofInputSchema)
  .outputSchema(getIssueProofOutputSchema)
  .action(async ({ parsedInput: { issueId } }) => {
    return { success: true as const, proof: await getIssueProofData(issueId) };
  });
