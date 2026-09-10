'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { downloadTelegramFileAsBase64 } from '@/lib/services/telegram/telegram-file';
import { getIssueProofInputSchema, getIssueProofOutputSchema } from './schemas';

/**
 * Resolves an issue's proof screenshot. `proofImageUrl` is a Telegram file_id
 * uploaded via the buyer-bot, so it must be resolved through the Bot API with
 * BUYER_BOT_TOKEN (same pattern as get-batch-images, different bot).
 */
export const getIssueProof = adminActionClient
  .inputSchema(getIssueProofInputSchema)
  .outputSchema(getIssueProofOutputSchema)
  .action(async ({ parsedInput: { issueId } }) => {
    const issue = await prisma.giftcardIssue.findUnique({
      where: { id: issueId },
      select: { proofImageUrl: true },
    });

    if (!issue?.proofImageUrl) {
      return { success: true as const, proof: null };
    }

    const botToken = process.env.BUYER_BOT_TOKEN;
    if (!botToken) {
      throw new ActionError('BUYER_BOT_TOKEN is missing on server');
    }

    const downloaded = await downloadTelegramFileAsBase64(botToken, issue.proofImageUrl);
    if (!downloaded) {
      return { success: true as const, proof: null };
    }

    const mimeType = downloaded.filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    return {
      success: true as const,
      proof: { mimeType, base64: downloaded.base64 },
    };
  });
