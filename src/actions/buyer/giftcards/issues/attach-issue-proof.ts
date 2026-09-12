'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';
import { encryptBuffer } from '@/lib/encryption';
import { attachIssueProof as attachIssueProofService } from '@/lib/services/order';
import { attachIssueProofInputSchema, attachIssueProofOutputSchema } from './schemas';

/**
 * Attach (or replace) the proof screenshot of an EXISTING issue — late attach
 * from the buyer's order history. Works in any order status: the provider
 * usually asks for evidence after the order was confirmed/paid.
 */
export const attachIssueProof = buyerActionClient
  .inputSchema(attachIssueProofInputSchema)
  .outputSchema(attachIssueProofOutputSchema)
  .action(async ({ parsedInput: { issueId, file }, ctx }) => {
    let proofData: Uint8Array<ArrayBuffer>;
    let proofMimeType: string;
    try {
      const compressed = await compressImage(file);
      proofData = new Uint8Array(encryptBuffer(compressed.buffer).data);
      proofMimeType = compressed.mimeType;
    } catch (error) {
      throw new ActionError(error instanceof Error ? error.message : 'No se pudo procesar la captura de evidencia');
    }

    try {
      await attachIssueProofService({ issueId, userId: ctx.auth.user.id, proofData, proofMimeType });
      return { success: true as const };
    } catch (err) {
      throw new ActionError((err as Error).message || 'Error al adjuntar la evidencia');
    }
  });
