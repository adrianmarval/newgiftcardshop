'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getIssueProofData } from '@/lib/services/order';
import { getIssueProofInputSchema, getIssueProofOutputSchema } from './schemas';

/**
 * Resolves the proof screenshot of the buyer's OWN issue (dual source:
 * encrypted web bytes / Telegram file_id — same resolver as the admin action).
 * Used by IssueProofDialog (attach mode) to show the current evidence before
 * replacing it.
 */
export const getIssueProof = buyerActionClient
  .inputSchema(getIssueProofInputSchema)
  .outputSchema(getIssueProofOutputSchema)
  .action(async ({ parsedInput: { issueId }, ctx }) => {
    const issue = await prisma.giftcardIssue.findUnique({
      where: { id: issueId },
      select: { reportedById: true },
    });
    if (!issue) throw new ActionError('Reporte no encontrado');
    if (issue.reportedById !== ctx.auth.user.id) throw new ActionError('No autorizado');

    return { success: true as const, proof: await getIssueProofData(issueId) };
  });
