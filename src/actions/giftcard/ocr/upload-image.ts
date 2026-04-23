'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';
import { uploadProvenanceImageInputSchema } from '@/types/application/sell-flow';
import { z } from 'zod';

export const uploadProvenanceImage = sellerActionClient
  .inputSchema(uploadProvenanceImageInputSchema)
  .outputSchema(
    z.union([z.object({ success: z.literal(true), compressedData: z.string(), mimeType: z.string() }), z.object({ error: z.string() })]),
  )
  .action(async ({ parsedInput: { file } }) => {
    try {
      const { buffer, mimeType } = await compressImage(file);
      return { success: true as const, compressedData: buffer.toString('base64'), mimeType };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to upload provenance image' };
    }
  });
