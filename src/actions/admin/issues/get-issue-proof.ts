'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
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

    try {
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${issue.proofImageUrl}`);
      const fileData = await fileRes.json();

      if (!fileData.ok) {
        console.error(`[AdminIssueProof] Error fetching file info from Telegram for issue ${issueId}`);
        return { success: true as const, proof: null };
      }

      const filePath: string = fileData.result.file_path;
      const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      const buffer = Buffer.from(await downloadRes.arrayBuffer());
      const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      return {
        success: true as const,
        proof: { mimeType, base64: buffer.toString('base64') },
      };
    } catch (err) {
      console.error('[AdminIssueProof] Error downloading telegram file:', err);
      return { success: true as const, proof: null };
    }
  });
